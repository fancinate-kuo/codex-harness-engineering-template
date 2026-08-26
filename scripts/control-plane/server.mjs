import http from "node:http";
import { spawn } from "node:child_process";
import { readJson } from "./lib/read-model.mjs";
import { createRuntimeReadModel } from "./lib/runtime-read-model.mjs";
import {
  actorFromRequest,
  appendMutationAudit,
  createControlPlaneSecurityConfig,
  isAllowedOrigin,
  isAuthorized,
  isJsonContentType,
  parseJsonBody,
  validateApprovalPayload,
  validateTaskId,
} from "./lib/security.mjs";

const cfg=readJson(".codex/control-plane/config.json",{api:{host:"127.0.0.1",port:4317}});
const host=process.env.HARNESS_CONTROL_PLANE_HOST ?? cfg.api?.host ?? "127.0.0.1";
const port=Number(process.env.HARNESS_CONTROL_PLANE_PORT ?? cfg.api?.port ?? 4317);
const runtimeReadModel=createRuntimeReadModel();
const security=createControlPlaneSecurityConfig({host,port,config:cfg});

const sseClients=new Set();

function send(res,status,body,req=null){
  const text=JSON.stringify(body,null,2);
  const origin=req?.headers?.origin;
  const headers={
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-methods":"GET,POST,OPTIONS",
    "access-control-allow-headers":"authorization,content-type,x-control-plane-actor",
    "cache-control":"no-store",
    "referrer-policy":"no-referrer",
    "x-content-type-options":"nosniff",
    "vary":"Origin"
  };
  if(origin && isAllowedOrigin(origin,security)) headers["access-control-allow-origin"]=origin;
  res.writeHead(status,headers);
  res.end(text);
}

function emit(event,payload){
  const message=`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for(const res of sseClients){
    try{res.write(message);}catch{}
  }
}

function runDetached(taskId){
  const child=spawn(process.execPath,["scripts/control-plane/runtime-run.mjs",taskId],{
    detached:true,
    stdio:"ignore",
    shell:false
  });
  child.unref();
  emit("task",{taskId,action:"run-requested",at:new Date().toISOString()});
}

setInterval(()=>{
  runtimeReadModel.overview().then(currentOverview => emit("snapshot",{
    overview:currentOverview,
    at:new Date().toISOString()
  })).catch(error => emit("error",{message:error.message}));
},5000).unref();

const server=http.createServer(async (req,res)=>{
  try {
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  const parts=url.pathname.split("/").filter(Boolean);

  if(req.method==="OPTIONS"){
    if(!isAllowedOrigin(req.headers.origin,security)){send(res,403,{error:"origin_not_allowed"},req);return;}
    send(res,200,{ok:true},req);
    return;
  }

  if(!isAllowedOrigin(req.headers.origin,security)){
    send(res,403,{error:"origin_not_allowed"},req);
    return;
  }

  if(req.method==="GET" && url.pathname==="/events"){
    if(!isAuthorized(req,security)){
      res.setHeader("www-authenticate","Bearer");
      send(res,401,{error:"authentication_required"},req);
      return;
    }
    res.writeHead(200,{
      "content-type":"text/event-stream",
      "cache-control":"no-cache",
      "connection":"keep-alive",
      ...(req.headers.origin && {"access-control-allow-origin":req.headers.origin}),
      "x-content-type-options":"nosniff",
      "vary":"Origin"
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ok:true})}\n\n`);
    sseClients.add(res);
    req.on("close",()=>sseClients.delete(res));
    return;
  }

  if(req.method==="GET" && url.pathname==="/health"){
    send(res,200,{ok:true,version:"0.16.0",runtimeStore:runtimeReadModel.mode,authRequired:security.requireAuth,sseClients:sseClients.size},req);
    return;
  }

  if(!isAuthorized(req,security)){
    res.setHeader("www-authenticate","Bearer");
    send(res,401,{error:"authentication_required"},req);
    return;
  }

  if(req.method==="GET" && url.pathname==="/overview"){
    send(res,200,await runtimeReadModel.overview(),req);
    return;
  }

  if(req.method==="GET" && url.pathname==="/tasks"){
    send(res,200,{tasks:await runtimeReadModel.taskList()},req);
    return;
  }

  if(parts[0]==="tasks" && parts[1]){
    let taskId;
    try{taskId=validateTaskId(decodeURIComponent(parts[1]));}
    catch(error){send(res,400,{error:error.code||"invalid_task_id"},req);return;}
    const detail=await runtimeReadModel.taskDetail(taskId);

    if(!detail.task){
      send(res,404,{error:"task_not_found",taskId},req);
      return;
    }

    if(req.method==="GET" && parts.length===2){
      send(res,200,detail,req);
      return;
    }

    if(req.method==="GET" && parts.length===3 && parts[2]==="dag"){
      send(res,200,{workflow:detail.workflow,state:detail.dag},req);
      return;
    }

    if(req.method==="GET" && parts.length===3 && parts[2]==="approvals"){
      send(res,200,{policy:detail.policy,risk:detail.risk,approval:detail.approval},req);
      return;
    }

    if(req.method==="POST" && parts.length===4 && parts[2]==="approvals" && ["approved","rejected"].includes(parts[3])){
      let payload;
      try{
        if(!isJsonContentType(req.headers["content-type"])){
          const error=new Error("Approval payload must use application/json");
          error.code="INVALID_CONTENT_TYPE";
          throw error;
        }
        payload=validateApprovalPayload(await parseJsonBody(req,{maxBytes:security.maxBodyBytes}));
      }catch(error){
        send(res,400,{error:error.code||"invalid_request"},req);
        return;
      }
      const decision=parts[3];
      const {decidedBy,reason}=payload;

      appendMutationAudit({taskId,action:`approval-${decision}-requested`,actor:decidedBy,metadata:{method:req.method,path:url.pathname}});

      const child=spawn(process.execPath,[
        "scripts/governance/approval-decide.mjs",
        taskId,decision,decidedBy,reason
      ],{
        stdio:["ignore","pipe","pipe"],
        shell:false
      });

      let output="";
      child.stdout.on("data",c=>output+=c);
      child.on("close",async code=>{
        if(code===0){
          const next=(await runtimeReadModel.taskDetail(taskId)).approval;
          appendMutationAudit({taskId,action:`approval-${decision}`,actor:decidedBy,metadata:{method:req.method,path:url.pathname}});
          emit("approval",{taskId,decision:next?.decision,at:new Date().toISOString()});
          send(res,200,next,req);
        }else{
          console.error(output);
          send(res,500,{error:"approval_update_failed"},req);
        }
      });
      return;
    }

    if(req.method==="POST" && parts.length===3 && parts[2]==="run"){
      appendMutationAudit({taskId,action:"run-requested",actor:actorFromRequest(req),metadata:{method:req.method,path:url.pathname}});
      runDetached(taskId);
      send(res,202,{accepted:true,taskId},req);
      return;
    }

    if(req.method==="GET" && parts.length===3 && parts[2]==="feedback"){
      send(res,200,{feedback:detail.feedback},req);
      return;
    }

    if(req.method==="GET" && parts.length===3 && parts[2]==="observability"){
      send(res,200,{
        summary:detail.observability,
        metrics:detail.metrics,
        audit:detail.audit,
        tokenCost:detail.tokenCost
      },req);
      return;
    }

    if(req.method==="GET" && parts.length===3 && parts[2]==="console"){
      const events=[
        ...(detail.audit||[]).map(x=>({kind:"audit",at:x.timestamp,payload:x})),
        ...(detail.feedback||[]).map(x=>({kind:"feedback",at:x.createdAt,payload:x})),
        ...(detail.metrics||[]).map(x=>({kind:"metric",at:x.timestamp,payload:x})),
        ...(detail.tokenCost||[]).map(x=>({kind:"token-cost",at:x.timestamp,payload:x}))
      ].sort((a,b)=>String(a.at||"").localeCompare(String(b.at||"")));
      send(res,200,{events},req);
      return;
    }
  }

  if(req.method==="GET" && url.pathname==="/evaluation/summary"){
    send(res,200,await runtimeReadModel.evaluationSummary(),req);
    return;
  }

  send(res,404,{error:"not_found"},req);
  } catch(error) {
    console.error(error.stack || error.message);
    if(!res.headersSent) send(res,500,{error:"internal_server_error"},req);
    else res.destroy();
  }
});

server.listen(port,host,()=>{
  console.log(`Harness Control Plane API: http://${host}:${port}`);
  console.log(`Harness SSE stream: http://${host}:${port}/events`);
});
