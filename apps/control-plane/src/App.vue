<template>
  <div v-if="isForumHome" class="forum-shell">
    <RouterView />
  </div>

  <div v-else class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">H</div>
        <div>
          <strong>Harness</strong>
          <span>Control Plane</span>
        </div>
      </div>
      <nav>
        <RouterLink to="/">Overview</RouterLink>
        <RouterLink to="/evaluation">Evaluation</RouterLink>
      </nav>
      <div class="connection">
        <span :class="['dot', connected ? 'ok' : 'off']"></span>
        {{ connected ? 'Live' : 'Offline' }}
      </div>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isForumHome = computed(() => route.name === 'forum-home')
const connected = ref(false)
let es: EventSource | null = null

onMounted(() => {
  es = new EventSource('/events')
  es.onopen = () => connected.value = true
  es.onerror = () => connected.value = false
})

onUnmounted(() => es?.close())
</script>
