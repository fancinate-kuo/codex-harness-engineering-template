const GRAPH_QUERY_TYPES = new Set(["context", "impact", "detect_changes"]);
const RISK_LEVELS = new Set(["low", "medium", "high", "critical", "unknown"]);

function issue(code, message, path = "") {
  return { code, message, ...(path ? { path } : {}) };
}

export function createGraphProvenance({
  queryType,
  target,
  indexedCommit,
  generatedAt,
  risk = "unknown",
  blastRadius = { summary: "unknown" }
}) {
  return {
    provider: "gitnexus",
    queryType,
    target,
    indexedCommit,
    generatedAt,
    risk,
    blastRadius
  };
}

export function validateGraphProvenance(provenance) {
  const errors = [];
  if (!provenance || typeof provenance !== "object") {
    return { valid: false, errors: [issue("missing-graph-provenance", "Graph provenance is required")] };
  }
  if (provenance.provider !== "gitnexus") {
    errors.push(issue("invalid-graph-provider", "Graph provenance provider must be gitnexus", "provider"));
  }
  if (!GRAPH_QUERY_TYPES.has(provenance.queryType)) {
    errors.push(issue("invalid-graph-query", "Graph provenance queryType must be context, impact, or detect_changes", "queryType"));
  }
  for (const key of ["target", "indexedCommit", "generatedAt"]) {
    if (typeof provenance[key] !== "string" || provenance[key].trim() === "") {
      errors.push(issue("missing-graph-field", `${key} is required in graph provenance`, key));
    }
  }
  if (typeof provenance.generatedAt === "string" && Number.isNaN(Date.parse(provenance.generatedAt))) {
    errors.push(issue("invalid-graph-timestamp", "generatedAt must be an ISO timestamp", "generatedAt"));
  }
  if (!RISK_LEVELS.has(provenance.risk)) {
    errors.push(issue("invalid-graph-risk", "risk must be a known risk level", "risk"));
  }
  const radius = provenance.blastRadius;
  if (!radius || typeof radius !== "object" || typeof radius.summary !== "string" || radius.summary.trim() === "") {
    errors.push(issue("missing-blast-radius", "blastRadius.summary is required", "blastRadius"));
  }
  for (const key of ["impactedSymbols", "impactedModules"]) {
    if (radius?.[key] !== undefined && (!Number.isInteger(radius[key]) || radius[key] < 0)) {
      errors.push(issue("invalid-blast-radius", `${key} must be a non-negative integer`, `blastRadius.${key}`));
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateImpactArtifact(impact) {
  const errors = [];
  if (!impact || typeof impact !== "object") {
    return { valid: false, errors: [issue("missing-impact", "Impact artifact is required")] };
  }
  const provenance = validateGraphProvenance(impact.graphProvenance);
  errors.push(...provenance.errors);
  if (typeof impact.risk !== "string") {
    errors.push(issue("missing-impact-risk", "Impact artifact must include risk", "risk"));
  }
  if (impact.graphProvenance?.risk && impact.risk && impact.graphProvenance.risk !== impact.risk) {
    errors.push(issue("impact-risk-mismatch", "Impact risk must match graph provenance risk", "risk"));
  }
  return { valid: errors.length === 0, errors };
}

export { GRAPH_QUERY_TYPES };
