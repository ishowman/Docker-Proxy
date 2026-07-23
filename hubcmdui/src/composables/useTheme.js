import { ref, watch } from 'vue'

const STORAGE_KEY = 'hubcmdui.theme' // 'light' | 'dark' | 'auto'
const APPLIED_KEY = 'hubcmdui.applied' // 'light' | 'dark' (实际应用)

const mode = ref(typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || 'auto' : 'auto')

function detectSystem() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(nextMode) {
  if (typeof document === 'undefined') return
  const eff = nextMode === 'auto' ? detectSystem() : nextMode
  const html = document.documentElement
  html.classList.toggle('dark', eff === 'dark')
  html.setAttribute('data-theme', eff)
  try { localStorage.setItem(APPLIED_KEY, eff) } catch (_) {}
}

function setMode(v) {
  mode.value = v
  try { localStorage.setItem(STORAGE_KEY, v) } catch (_) {}
  applyTheme(v)
}

// 首次加载：立即应用（避免主题闪烁）
applyTheme(mode.value)

// 监听系统主题变化（仅在 auto 时生效）
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => mode.value === 'auto' && applyTheme('auto')
  if (mq.addEventListener) mq.addEventListener('change', handler)
  else if (mq.addListener) mq.addListener(handler)
}

export function useTheme() {
  return { mode, setMode }
}
