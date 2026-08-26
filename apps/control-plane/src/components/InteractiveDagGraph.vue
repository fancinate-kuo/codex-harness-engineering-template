<template>
  <div class="graph-shell">
    <div class="graph-toolbar">
      <button class="secondary" @click="zoomBy(1.15)">＋</button>
      <button class="secondary" @click="zoomBy(0.87)">−</button>
      <button class="secondary" @click="resetView">Reset</button>
    </div>

    <div
      class="graph-viewport"
      @wheel.prevent="onWheel"
      @pointerdown="startPan"
      @pointermove="movePan"
      @pointerup="endPan"
      @pointerleave="endPan"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" class="dag-svg">
        <g :transform="`translate(${panX} ${panY}) scale(${zoom})`">
          <line
            v-for="edge in edges"
            :key="edge.key"
            :x1="edge.x1"
            :y1="edge.y1"
            :x2="edge.x2"
            :y2="edge.y2"
            class="dag-edge"
          />

          <g
            v-for="node in positioned"
            :key="node.id"
            :transform="`translate(${node.x} ${node.y})`"
            class="dag-svg-node"
            @click.stop="selectNode(node)"
          >
            <rect
              width="180"
              height="76"
              rx="12"
              :class="['node-rect', statusClass(node.id), selected?.id===node.id ? 'selected' : '']"
            />
            <text x="14" y="24" class="node-label">{{ node.id }}</text>
            <text x="14" y="44" class="node-agent">{{ node.agent }}</text>
            <text x="14" y="62" class="node-status">{{ status(node.id) }}</text>
          </g>
        </g>
      </svg>
    </div>

    <aside v-if="selected" class="graph-inspector">
      <strong>{{ selected.id }}</strong>
      <div>Agent: {{ selected.agent }}</div>
      <div v-if="selected.role">Role: {{ selected.role }}</div>
      <div>Status: {{ status(selected.id) }}</div>
      <div>Depends on: {{ selected.dependsOn?.join(', ') || '—' }}</div>
      <div>Mutable: {{ selected.mutable ? 'yes' : 'no' }}</div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ workflow?: any; state?: any }>()

const width = 1400
const height = 700
const zoom = ref(1)
const panX = ref(20)
const panY = ref(20)
const selected = ref<any>(null)
let panning = false
let lastX = 0
let lastY = 0

const nodes = computed(() => props.workflow?.nodes || [])
const levels = computed(() => {
  const result: Record<string, number> = {}
  const byId = Object.fromEntries(nodes.value.map((n:any)=>[n.id,n]))
  const calc = (id:string, stack=new Set<string>()):number => {
    if (result[id] !== undefined) return result[id]
    if (stack.has(id)) return 0
    stack.add(id)
    const n = byId[id]
    const deps = n?.dependsOn || []
    const level = deps.length ? Math.max(...deps.map((d:string)=>calc(d,new Set(stack)))) + 1 : 0
    result[id] = level
    return level
  }
  for (const n of nodes.value) calc(n.id)
  return result
})

const positioned = computed(() => {
  const groups: Record<number, any[]> = {}
  for (const n of nodes.value) {
    const level = levels.value[n.id] || 0
    ;(groups[level] ||= []).push(n)
  }
  return nodes.value.map((n:any) => {
    const level = levels.value[n.id] || 0
    const group = groups[level]
    const idx = group.findIndex(x=>x.id===n.id)
    return {
      ...n,
      x: 60 + level * 230,
      y: 50 + idx * 120
    }
  })
})

const edges = computed(() => {
  const map = Object.fromEntries(positioned.value.map((n:any)=>[n.id,n]))
  const out:any[] = []
  for (const n of positioned.value) {
    for (const dep of n.dependsOn || []) {
      const a = map[dep]
      if (!a) continue
      out.push({
        key: `${dep}->${n.id}`,
        x1: a.x + 180,
        y1: a.y + 38,
        x2: n.x,
        y2: n.y + 38
      })
    }
  }
  return out
})

function status(id:string) {
  return props.state?.nodes?.[id]?.status || 'pending'
}
function statusClass(id:string) {
  return `status-${status(id)}`
}
function selectNode(node:any) {
  selected.value = node
}
function zoomBy(f:number) {
  zoom.value = Math.min(2.2, Math.max(.45, zoom.value * f))
}
function resetView() {
  zoom.value = 1
  panX.value = 20
  panY.value = 20
}
function onWheel(e:WheelEvent) {
  zoomBy(e.deltaY < 0 ? 1.08 : .92)
}
function startPan(e:PointerEvent) {
  panning = true
  lastX = e.clientX
  lastY = e.clientY
}
function movePan(e:PointerEvent) {
  if (!panning) return
  panX.value += e.clientX - lastX
  panY.value += e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
}
function endPan() {
  panning = false
}
</script>
