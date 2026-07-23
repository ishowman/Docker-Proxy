import { ref, onMounted, onBeforeUnmount } from 'vue'

// 图表需要的全局 CSS 变量（与 src/styles/theme.css 中的浅/深两套变量对应）
const KEYS = [
  '--accent', '--accent-2', '--success', '--warning', '--danger',
  '--fg', '--fg-2', '--muted', '--muted-2', '--border', '--border-strong',
  '--bg-card', '--bg-card-2', '--bg-page', '--bg-hover', '--code-bg'
]

function read() {
  if (typeof document === 'undefined') return {}
  const cs = getComputedStyle(document.documentElement)
  const o = {}
  KEYS.forEach(k => { o[k] = (cs.getPropertyValue(k) || '').trim() })
  return o
}

// 全局单例：任意组件 import 后共享同一份 palette，
// 主题切换（data-theme / class=dark 变化）时统一刷新。
const palette = ref(read())
let observer = null
let mountedCount = 0

function ensureObserver() {
  if (observer || typeof document === 'undefined') return
  observer = new MutationObserver(() => { palette.value = read() })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class']
  })
}

export function useThemeColors() {
  onMounted(() => { mountedCount++; ensureObserver() })
  onBeforeUnmount(() => { mountedCount = Math.max(0, mountedCount - 1) })
  return { palette }
}
