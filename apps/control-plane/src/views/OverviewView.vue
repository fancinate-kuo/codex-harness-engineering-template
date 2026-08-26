<template>
  <section>
    <header class="page-header">
      <div>
        <h1>Engineering Control Plane</h1>
        <p>Tasks, agents, approvals, and benchmark health.</p>
      </div>
    </header>

    <div class="metrics">
      <MetricCard label="Total tasks" :value="overview.taskCounts?.total || 0" />
      <MetricCard label="Running" :value="overview.taskCounts?.running || 0" />
      <MetricCard label="Blocked" :value="overview.taskCounts?.blocked || 0" />
      <MetricCard label="Pending approvals" :value="overview.pendingApprovals || 0" />
      <MetricCard label="Benchmark pass rate" :value="`${overview.benchmarkPassRate || 0}%`" />
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>Task queue</h2>
        <button @click="load">Refresh</button>
      </div>

      <table class="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>State</th>
            <th>Priority</th>
            <th>Agent</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td>
              <RouterLink :to="`/tasks/${task.id}`">{{ task.id }}</RouterLink>
              <div class="muted">{{ task.title }}</div>
            </td>
            <td><StatusBadge :status="task.state" /></td>
            <td>{{ task.priority }}</td>
            <td>{{ task.assignedAgent || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { getJson } from '../lib/api'
import { useLiveRefresh } from '../composables/useLiveRefresh'

const overview = ref<any>({})
const tasks = ref<any[]>([])

async function load() {
  overview.value = await getJson('/overview')
  const result = await getJson<any>('/tasks')
  tasks.value = result.tasks || []
}

load()
useLiveRefresh(load)
</script>
