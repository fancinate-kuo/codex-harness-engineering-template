<template>
  <div class="console">
    <div class="console-toolbar">
      <strong>Execution console</strong>
      <button class="secondary" @click="load">Refresh</button>
    </div>
    <div class="console-body">
      <div v-if="!events.length" class="empty">No execution events yet.</div>
      <div v-for="(e,i) in events" :key="i" class="console-line">
        <span class="console-time">{{ formatTime(e.at) }}</span>
        <span :class="['console-kind', e.kind]">{{ e.kind }}</span>
        <code>{{ summarize(e.payload) }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getJson } from '../lib/api'
import { useLiveRefresh } from '../composables/useLiveRefresh'

const props = defineProps<{ taskId: string }>()
const events = ref<any[]>([])

async function load() {
  const r = await getJson<any>(`/tasks/${props.taskId}/console`)
  events.value = r.events || []
}

function formatTime(v?:string) {
  if (!v) return '—'
  try { return new Date(v).toLocaleTimeString() } catch { return v }
}

function summarize(v:any) {
  if (!v) return ''
  if (v.action) return `${v.actor || ''} ${v.action} ${v.reason || ''}`.trim()
  if (v.source) return `${v.source} ${v.status} ${v.summary || ''}`.trim()
  if (v.type) return `${v.type} = ${v.value ?? ''}`.trim()
  if (v.inputTokens !== undefined) return `tokens in=${v.inputTokens} out=${v.outputTokens} cost=${v.estimatedCostUsd ?? 'n/a'}`
  return JSON.stringify(v)
}

load()
useLiveRefresh(load)
</script>
