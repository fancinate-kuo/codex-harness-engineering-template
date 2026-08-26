export function usage(state, workflow) {
  const byId = Object.fromEntries((workflow.nodes ?? []).map(n => [n.id,n]));
  let global=0, mutable=0, readOnly=0; const roles={};
  for (const [id,s] of Object.entries(state.nodes ?? {})) {
    if (s.status !== "running") continue;
    const n=byId[id]; if (!n) continue;
    global++; n.mutable ? mutable++ : readOnly++;
    roles[n.agent]=(roles[n.agent]??0)+1;
  }
  return {global,mutable,readOnly,roles};
}
export function canAllocate(node,state,workflow,pool) {
  const u=usage(state,workflow), l=pool.limits??{}, r=pool.roles??{};
  if (u.global >= (l.global ?? Infinity)) return false;
  if (node.mutable && u.mutable >= (l.mutable ?? Infinity)) return false;
  if (!node.mutable && u.readOnly >= (l.readOnly ?? Infinity)) return false;
  return (u.roles[node.agent] ?? 0) < (r[node.agent] ?? Infinity);
}
