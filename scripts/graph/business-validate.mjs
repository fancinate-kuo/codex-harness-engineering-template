import fs from "node:fs";

const file = "graph/business/business-graph.json";
const graph = JSON.parse(fs.readFileSync(file, "utf8"));

const errors = [];
const ids = (arr) => new Set((arr ?? []).map(x => x.id));

const featureIds = ids(graph.features);
const capabilityIds = ids(graph.capabilities);
const moduleIds = ids(graph.modules);
const apiIds = ids(graph.apis);
const tableIds = ids(graph.tables);
const testIds = ids(graph.tests);
const adrIds = ids(graph.adrs);

for (const req of graph.requirements ?? []) {
  for (const fid of req.features ?? []) {
    if (!featureIds.has(fid)) errors.push(`Requirement ${req.id} references missing feature ${fid}`);
  }
}

for (const f of graph.features ?? []) {
  if (f.capability && !capabilityIds.has(f.capability)) {
    errors.push(`Feature ${f.id} references missing capability ${f.capability}`);
  }
  if (f.module && !moduleIds.has(f.module)) {
    errors.push(`Feature ${f.id} references missing module ${f.module}`);
  }
  for (const x of f.apis ?? []) if (!apiIds.has(x)) errors.push(`Feature ${f.id} missing API ${x}`);
  for (const x of f.tables ?? []) if (!tableIds.has(x)) errors.push(`Feature ${f.id} missing table ${x}`);
  for (const x of f.tests ?? []) if (!testIds.has(x)) errors.push(`Feature ${f.id} missing test ${x}`);
  for (const x of f.adrs ?? []) if (!adrIds.has(x)) errors.push(`Feature ${f.id} missing ADR ${x}`);
}

for (const t of graph.tables ?? []) {
  if (t.ownerModule && !moduleIds.has(t.ownerModule)) {
    errors.push(`Table ${t.id} references missing owner module ${t.ownerModule}`);
  }
}

if (errors.length) {
  console.error("Business Graph validation FAILED");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log("Business Graph validation PASS");
console.log(`Requirements: ${(graph.requirements ?? []).length}`);
console.log(`Features: ${(graph.features ?? []).length}`);
console.log(`Capabilities: ${(graph.capabilities ?? []).length}`);
console.log(`Modules: ${(graph.modules ?? []).length}`);
