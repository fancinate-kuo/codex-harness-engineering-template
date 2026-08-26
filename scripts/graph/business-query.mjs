import fs from "node:fs";

const graphPath = "graph/business/business-graph.json";

if (!fs.existsSync(graphPath)) {
  console.error(`Missing ${graphPath}`);
  process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const command = process.argv[2];
const id = process.argv[3];

if (!command || !id) {
  console.log(`
Usage:
  pnpm graph:business feature forum.reply.edit
  pnpm graph:business requirement REQ-FORUM-001
  pnpm graph:business module forum
  `);
  process.exit(0);
}

const find = (list, key) => (list ?? []).find(x => x.id === key);

if (command === "feature") {
  const feature = find(graph.features, id);
  if (!feature) {
    console.error(`Feature not found: ${id}`);
    process.exit(2);
  }

  const requirement = (graph.requirements ?? []).filter(r =>
    (r.features ?? []).includes(id)
  );

  const result = {
    feature,
    requirements: requirement,
    capability: find(graph.capabilities, feature.capability),
    module: find(graph.modules, feature.module),
    apis: (feature.apis ?? []).map(x => find(graph.apis, x)).filter(Boolean),
    tables: (feature.tables ?? []).map(x => find(graph.tables, x)).filter(Boolean),
    tests: (feature.tests ?? []).map(x => find(graph.tests, x)).filter(Boolean),
    adrs: (feature.adrs ?? []).map(x => find(graph.adrs, x)).filter(Boolean)
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (command === "requirement") {
  const requirement = find(graph.requirements, id);
  if (!requirement) {
    console.error(`Requirement not found: ${id}`);
    process.exit(2);
  }

  const features = (requirement.features ?? [])
    .map(x => find(graph.features, x))
    .filter(Boolean);

  const testIds = [...new Set(features.flatMap(f => f.tests ?? []))];

  console.log(JSON.stringify({
    requirement,
    features,
    tests: testIds.map(x => find(graph.tests, x)).filter(Boolean)
  }, null, 2));
  process.exit(0);
}

if (command === "module") {
  const module = find(graph.modules, id);
  if (!module) {
    console.error(`Module not found: ${id}`);
    process.exit(2);
  }

  const features = (graph.features ?? []).filter(f => f.module === id);

  console.log(JSON.stringify({
    module,
    features,
    capabilities: (graph.capabilities ?? []).filter(c =>
      (c.modules ?? []).includes(id)
    ),
    apis: (graph.apis ?? []).filter(a =>
      features.some(f => (f.apis ?? []).includes(a.id))
    ),
    tables: (graph.tables ?? []).filter(t => t.ownerModule === id),
    tests: (graph.tests ?? []).filter(t =>
      (t.verifies ?? []).some(fid => features.some(f => f.id === fid))
    )
  }, null, 2));
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(2);
