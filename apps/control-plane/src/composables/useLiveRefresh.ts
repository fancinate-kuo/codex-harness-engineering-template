import { onMounted, onUnmounted } from 'vue'

export function useLiveRefresh(refresh: () => void) {
  let es: EventSource | null = null

  onMounted(() => {
    es = new EventSource('/events')
    es.addEventListener('snapshot', refresh)
    es.addEventListener('task', refresh)
    es.addEventListener('approval', refresh)
    es.addEventListener('feedback', refresh)
    es.addEventListener('metrics', refresh)
  })

  onUnmounted(() => es?.close())
}
