<template>
  <div class="dag">
    <div
      v-for="node in ordered"
      :key="node.id"
      class="dag-node"
      :data-status="state?.nodes?.[node.id]?.status || 'pending'"
    >
      <div class="node-title">
        <strong>{{ node.id }}</strong>
        <StatusBadge :status="state?.nodes?.[node.id]?.status || 'pending'" />
      </div>
      <div class="node-meta">
        <span>{{ node.agent }}</span>
        <span v-if="node.role">· {{ node.role }}</span>
      </div>
      <div class="deps" v-if="node.dependsOn?.length">
        ← {{ node.dependsOn.join(', ') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  workflow?: any
  state?: any
}>()

const ordered = computed(() => props.workflow?.nodes || [])
</script>
