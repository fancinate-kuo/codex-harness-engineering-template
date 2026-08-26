import fs from "node:fs";

const input = process.argv.slice(2).join(" ").trim();

if (!input) {
  console.log(`
Usage:
  pnpm graph:route "impact: PostService.update"
  pnpm graph:route "security: user-controlled input to SQL"
  pnpm graph:route "semantic: find implementations of ReplyRepository"
  `);
  process.exit(0);
}

const [rawKind, ...rest] = input.split(":");
const kind = rawKind.trim().toLowerCase();
const target = rest.join(":").trim();

let provider = "gitnexus";
let tool = "query";

switch (kind) {
  case "impact":
    provider = "gitnexus";
    tool = "impact";
    break;
  case "changes":
    provider = "gitnexus";
    tool = "detect_changes";
    break;
  case "context":
    provider = "gitnexus";
    tool = "context";
    break;
  case "security":
    provider = "joern";
    tool = "cpg-query";
    break;
  case "semantic":
    provider = "scip";
    tool = "semantic-index";
    break;
  default:
    provider = "gitnexus";
    tool = "query";
}

const routed = {
  kind,
  target: target || input,
  provider,
  recommendedTool: tool
};

console.log(JSON.stringify(routed, null, 2));

if (provider === "gitnexus") {
  console.log("");
  console.log(`Agent instruction: use GitNexus MCP tool '${tool}' for this request.`);
} else {
  console.log("");
  console.log(`Agent instruction: use ${provider.toUpperCase()} provider for this specialist query.`);
}
