import { ref } from 'vue'
import { checkSession } from '../services'

// 全局共享的登录态（单例）：AdminShell 与 Login 共用。
// - authed：是否已登录
// - ready：是否已完成首次会话检查（用于避免刷新 /admin 时闪现登录页）
// 登录成功后 Login 调用 refresh() 即可让 AdminShell 立即切换到后台布局。
const authed = ref(false)
const ready = ref(false)
let checking = false
let pendingPromise = null

async function refresh() {
  // 同一时刻只允许一个检查在跑；并发调用直接复用同一次结果，避免重复请求
  if (pendingPromise) return pendingPromise
  pendingPromise = (async () => {
    checking = true
    try {
      const res = await checkSession()
      authed.value = !!(res && res.authenticated)
    } catch (e) {
      authed.value = false
    } finally {
      checking = false
      ready.value = true
      pendingPromise = null
    }
    return authed.value
  })()
  return pendingPromise
}

export function useAuth() {
  return { authed, ready, refresh }
}
