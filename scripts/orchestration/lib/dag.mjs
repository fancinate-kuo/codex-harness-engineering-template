export function depsSatisfied(node, state) {
  for (const depId of node.dependsOn ?? []) {
    const s = state.nodes?.[depId]?.status ?? "pending";
    if (s === "passed") continue;
    if (s === "skipped" && node.allowSkippedDependencies) continue;
    return false;
  }
  return true;
}
export function hasFailedDependency(node, state) {
  return (node.dependsOn ?? []).some(id => ["failed","blocked"].includes(state.nodes?.[id]?.status));
}
export function runnableNodes(workflow, state) {
  return (workflow.nodes ?? []).filter(node => {
    const s = state.nodes?.[node.id]?.status ?? "pending";
    return ["pending","ready"].includes(s) && !hasFailedDependency(node,state) && depsSatisfied(node,state);
  });
}
