import fs from "node:fs";

const featureId = process.argv[2];
const title = process.argv.slice(3).join(" ");

if (!featureId || !title) {
  console.log(`Usage: pnpm graph:feature:add forum.post.pin "Pin forum post"`);
  process.exit(0);
}

const graphPath = "graph/business/business-graph.json";
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));

if ((graph.features ?? []).some(f => f.id === featureId)) {
  console.error(`Feature already exists: ${featureId}`);
  process.exit(2);
}

graph.features.push({
  id: featureId,
  title,
  capability: "",
  module: "",
  apis: [],
  tables: [],
  tests: [],
  adrs: [],
  owners: [],
  risk: "unknown"
});

fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2) + "\n");
console.log(`Added feature scaffold: ${featureId}`);
console.log("Fill capability/module/apis/tables/tests/adrs before completion.");
