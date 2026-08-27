export function formatReadCount(value: number) {
  if (value < 1000) return String(value)
  return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`
}

export function formatRelativeTime(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (elapsedMinutes < 1) return '剛剛'
  if (elapsedMinutes < 60) return `${elapsedMinutes} 分鐘前`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours} 小時前`
  const elapsedDays = Math.floor(elapsedHours / 24)
  return `${elapsedDays} 天前`
}
