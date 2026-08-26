<template>
  <section>
    <header class="page-header">
      <div>
        <h1>Evaluation</h1>
        <p>Harness benchmark health and regression signal.</p>
      </div>
    </header>

    <div class="metrics">
      <MetricCard label="Benchmarks" :value="summary.count || 0" />
      <MetricCard label="Passed" :value="summary.passed || 0" />
      <MetricCard label="Failed" :value="summary.failed || 0" />
      <MetricCard label="Pass rate" :value="`${summary.passRate || 0}%`" />
      <MetricCard label="Average score" :value="summary.averageScore || 0" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import { getJson } from '../lib/api'
import { useLiveRefresh } from '../composables/useLiveRefresh'

const summary = ref<any>({})
async function load() {
  summary.value = await getJson('/evaluation/summary')
}
load()
useLiveRefresh(load)
</script>
