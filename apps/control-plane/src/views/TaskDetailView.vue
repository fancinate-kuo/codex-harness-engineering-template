<template>
  <section v-if="detail">
    <header class="page-header">
      <div>
        <RouterLink to="/" class="back">← Tasks</RouterLink>
        <h1>{{ detail.task?.id }}</h1>
        <p>{{ detail.task?.title }}</p>
      </div>
      <button @click="runTask">Run next</button>
    </header>

    <div class="metrics">
      <MetricCard label="State" :value="detail.task?.state || '—'" />
      <MetricCard label="Risk" :value="detail.risk?.risk || '—'" />
      <MetricCard label="Policy" :value="detail.policy?.automationDecision || '—'" />
      <MetricCard label="Approval" :value="detail.approval?.decision || '—'" />
      <MetricCard label="Tokens" :value="totalTokens" />
      <MetricCard label="Est. cost" :value="estimatedCost" />
    </div>

    <div v-if="detail.approval?.decision === 'pending'" class="approval-banner">
      <div>
        <strong>Approval required</strong>
        <div>{{ detail.approval.reason }}</div>
      </div>
      <div class="actions">
        <button @click="decide('approved')">Approve</button>
        <button class="secondary" @click="decide('rejected')">Reject</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title"><h2>Interactive execution DAG</h2></div>
      <InteractiveDagGraph :workflow="detail.workflow" :state="detail.dag" />
    </div>

    <div class="panel">
      <ExecutionConsole :task-id="taskId" />
    </div>

    <div class="two-col">
      <div class="panel">
        <div class="panel-title"><h2>Feedback</h2></div>
        <div v-if="!detail.feedback?.length" class="empty">No feedback events.</div>
        <article v-for="(f, i) in detail.feedback" :key="i" class="event">
          <StatusBadge :status="f.status" />
          <strong>{{ f.source }}</strong>
          <div>{{ f.summary }}</div>
        </article>
      </div>

      <div class="panel">
        <div class="panel-title"><h2>Observability</h2></div>
        <pre>{{ JSON.stringify(detail.observability || {}, null, 2) }}</pre>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import InteractiveDagGraph from '../components/InteractiveDagGraph.vue'
import ExecutionConsole from '../components/ExecutionConsole.vue'
import { getJson, postJson } from '../lib/api'
import { useLiveRefresh } from '../composables/useLiveRefresh'

const props = defineProps<{ taskId: string }>()
const detail = ref<any>(null)
const taskId = props.taskId

const totalTokens = computed(() => (detail.value?.tokenCost || [])
  .reduce((n:number,x:any)=>n+(x.inputTokens||0)+(x.outputTokens||0),0))

const estimatedCost = computed(() => {
  const v = (detail.value?.tokenCost || [])
    .reduce((n:number,x:any)=>n+(x.estimatedCostUsd||0),0)
  return v ? `$${v.toFixed(4)}` : '—'
})

async function load() {
  detail.value = await getJson(`/tasks/${props.taskId}`)
}

async function runTask() {
  await postJson(`/tasks/${props.taskId}/run`)
  setTimeout(load, 400)
}

async function decide(decision: 'approved' | 'rejected') {
  await postJson(`/tasks/${props.taskId}/approvals/${decision}`, {
    decidedBy: 'dashboard',
    reason: `Decision from Control Plane dashboard`
  })
  await load()
}

load()
useLiveRefresh(load)
</script>
