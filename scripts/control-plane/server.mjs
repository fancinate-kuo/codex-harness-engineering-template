import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { overview, taskList, taskDetail, readJson } from "./lib/read-model.mjs";

const cfg=readJson(".codex/control-plane/config.json",{api:{host:"127.0.0.1",port:4317}});
const host=cfg.api?.host ?? "127.0.0.1";
const port=cfg.api?.port ?? 4317;

const sseClients=new Set();

function send(res,status,body){
  const text=JSON.stringify(body,null,2);
  res.writeHead(status,{
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":"*",
    "access-control-allow-methods":"GET,POST,OPTIONS",
    "access-control-allow-headers":"content-type"
  });
  res.end(text);
}

function body(req){
  return new Promise(resolve=>{
    let data="";
    req.on("data",c=>data+=c);
    req.on("end",()=>{
      try{resolve(data?JSON.parse(data):{});}catch{resolve({});}
    });
  });
}

function emit(event,payload){
  const message=`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for(const res of sseClients){
    try{res.write(message);}catch{}
  }
}

function runDetached(cmd,args,taskId){
  const child=spawn(cmd,args,{
    detached:true,
    stdio:"ignore",
    shell:process.platform==="win32"
  });
  child.unref();
  emit("task",{taskId,action:"run-requested",at:new Date().toISOString()});
}

setInterval(()=>{
  emit("snapshot",{
    overview:overview(),
    at:new Date().toISOString()
  });
},5000).unref();

const server=http.createServer(async (req,res)=>{
  if(req.method==="OPTIONS"){send(res,200,{ok:true});return;}

  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  const parts=url.pathname.split("/").filter(Boolean);

  if(req.method==="GET" && url.pathname==="/events"){
    res.writeHead(200,{
      "content-type":"text/event-stream",
      "cache-control":"no-cache",
      "connection":"keep-alive",
      "access-control-allow-origin":"*"
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ok:true})}\n\n`);
    sseClients.add(res);
    req.on("close",()=>sseClients.delete(res));
    return;
  }

  if(req.method==="GET" && url.pathname==="/health"){
    send(res,200,{ok:true,version:"0.16.0",sseClients:sseClients.size});
    return;
  }

  if(req.method==="GET" && url.pathname==="/overview"){
    send(res,200,overview());
    return;
  }

  if(req.method==="GET" && url.pathname==="/tasks"){
    send(res,200,{tasks:taskList()});
    return;
  }

  if(parts[0]==="tasks" && parts[1]){
    const taskId=parts[1];
    const detail=taskDetail(taskId);

    if(!detail.task){
      send(res,404,{error:"task_not_found",taskId});
      return;
    }

    if(req.method==="GET" && parts.length===2){
      send(res,200,detail);
      return;
    }

    if(req.method==="GET" && parts[2]==="dag"){
      send(res,200,{workflow:detail.workflow,state:detail.dag});
      return;
    }

    if(req.method==="GET" && parts[2]==="approvals"){
      send(res,200,{policy:detail.policy,risk:detail.risk,approval:detail.approval});
      return;
    }

    if(req.method==="POST" && parts[2]==="approvals" && ["approved","rejected"].includes(parts[3])){
      const payload=await body(req);
      const decision=parts[3];
      const decidedBy=payload.decidedBy ?? "control-plane";
      const reason=payload.reason ?? "";

      const child=spawn("node",[
        "scripts/governance/approval-decide.mjs",
        taskId,decision,decidedBy,reason
      ],{
        stdio:["ignore","pipe","pipe"],
        shell:process.platform==="win32"
      });

      let output="";
      child.stdout.on("data",c=>output+=c);
      child.on("close",code=>{
        if(code===0){
          const next=taskDetail(taskId).approval;
          emit("approval",{taskId,decision:next?.decision,at:new Date().toISOString()});
          send(res,200,next);
        }else{
          send(res,500,{error:"approval_update_failed",output});
        }
      });
      return;
    }

    if(req.method==="POST" && parts[2]==="run"){
      runDetached("pnpm",["harness:dag:run",taskId],taskId);
      send(res,202,{accepted:true,taskId});
      return;
    }

    if(req.method==="GET" && parts[2]==="feedback"){
      send(res,200,{feedback:detail.feedback});
      return;
    }

    if(req.method==="GET" && parts[2]==="observability"){
      send(res,200,{
        summary:detail.observability,
        metrics:detail.metrics,
        audit:detail.audit,
        tokenCost:detail.tokenCost
      });
      return;
    }

    if(req.method==="GET" && parts[2]==="console"){
      const events=[
        ...(detail.audit||[]).map(x=>({kind:"audit",at:x.timestamp,payload:x})),
        ...(detail.feedback||[]).map(x=>({kind:"feedback",at:x.createdAt,payload:x})),
        ...(detail.metrics||[]).map(x=>({kind:"metric",at:x.timestamp,payload:x})),
        ...(detail.tokenCost||[]).map(x=>({kind:"token-cost",at:x.timestamp,payload:x}))
      ].sort((a,b)=>String(a.at||"").localeCompare(String(b.at||"")));
      send(res,200,{events});
      return;
    }
  }

  if(req.method==="GET" && url.pathname==="/evaluation/summary"){
    send(res,200,readJson(".codex/evaluation/results/summary.json",{count:0,passRate:0}));
    return;
  }

  send(res,404,{error:"not_found"});
});

server.listen(port,host,()=>{
  console.log(`Harness Control Plane API: http://${host}:${port}`);
  console.log(`Harness SSE stream: http://${host}:${port}/events`);
});
