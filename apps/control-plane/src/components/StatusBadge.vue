<template>
  <span :class="['badge', statusClass]">{{ status }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ status?: string | null }>()

const statusClass = computed(() => {
  const s = props.status || 'unknown'
  if (['passed','completed','approved','auto','auto-with-gates'].includes(s)) return 'success'
  if (['running','planning','testing','reviewing','implementing'].includes(s)) return 'running'
  if (['blocked','failed','rejected','critical'].includes(s)) return 'danger'
  if (['pending','approval-required','manual-only','high'].includes(s)) return 'warning'
  return 'neutral'
})
</script>
