<template>
  <div class="login-wrap">
    <!-- 原登录页背景图 /images/login-bg.jpg（忠实还原旧 UI 观感） -->
    <div class="login-bg" :style="{ backgroundImage: 'url(/images/login-bg.jpg)' }"></div>
    <!-- 低透明度渐变蒙版，让照片透出 -->
    <div class="login-scrim"></div>

    <el-card class="login-card" shadow="never">
      <!-- 品牌区：使用项目官方 logo 图片 -->
      <div class="brand">
        <img class="brand-logo" src="/images/docker-proxy.png" alt="Docker 镜像加速服务" />
        <h1 class="brand-title">HubCmdUI</h1>
        <p class="brand-sub">Docker 镜像代理加速系统 · 管理控制台</p>
      </div>

      <el-form :model="form" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名" class="field">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" class="field">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-form-item label="验证码" class="field">
          <div class="captcha-row">
            <el-input
              v-model="form.captcha"
              placeholder="请输入右侧验证码（不区分大小写）"
              :prefix-icon="Key"
              size="large"
              @keyup.enter="onSubmit"
            />
            <div
              class="captcha-box"
              :class="{ error: captchaError, loading: captchaLoading }"
              title="点击刷新验证码"
              @click="loadCaptcha"
            >
              <template v-if="captchaLoading">
                <el-icon class="captcha-icon spin"><Loading /></el-icon>
                <span class="captcha-hint">加载中</span>
              </template>
              <template v-else-if="captchaError">
                <el-icon class="captcha-icon"><Warning /></el-icon>
                <span class="captcha-hint">点击重试</span>
              </template>
              <template v-else>
                <span class="captcha-code">{{ captchaText }}</span>
              </template>
            </div>
          </div>
        </el-form-item>

        <el-button type="primary" :loading="loading" native-type="submit" class="submit-btn">
          登 录
        </el-button>
      </el-form>

      <div class="login-foot">
        <i class="fas fa-shield-halved"></i>
        连接已加密 · 仅授权用户可访问
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Key, Loading, Warning } from '@element-plus/icons-vue'
import { getCaptcha, login, checkSession } from '../services'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  // 登录成功后跳转目标（来自 AdminShell 传入，保持 URL 干净）
  redirect: { type: String, default: '' }
})

// 通知父级（AdminShell）登录已完成，让它处理跳转与状态切换
const emit = defineEmits(['logged-in'])

const route = useRoute()
const router = useRouter()
const { refresh } = useAuth()
const form = ref({ username: '', password: '', captcha: '' })
const captchaText = ref('')
const captchaLoading = ref(false)
const captchaError = ref(false)
const loading = ref(false)

async function loadCaptcha() {
  captchaLoading.value = true
  captchaError.value = false
  try {
    const data = await getCaptcha()
    if (data && data.captcha) {
      captchaText.value = data.captcha
      captchaError.value = false
    } else {
      throw new Error('empty captcha')
    }
  } catch (e) {
    captchaText.value = ''
    captchaError.value = true
  } finally {
    captchaLoading.value = false
  }
}

async function onSubmit() {
  if (!form.value.username || !form.value.password || !form.value.captcha) {
    ElMessage.warning('请填写完整信息')
    return
  }
  loading.value = true
  try {
    const data = await login(form.value)
    if (data && data.success) {
      ElMessage.success('登录成功')
      // 关键：先把全局 authed 同步为 true，AdminShell 才会从 Login 切到 AdminLayout
      // 这里不能依赖 router.replace('/admin') —— 当用户已经在 /admin 时
      // replace 同一路径不会触发任何变化，Login 会一直停留在屏幕。
      await refresh()
      // 通知父级处理跳转到具体子路由（如果 intended 不在 /admin 本身）
      emit('logged-in')
    } else {
      ElMessage.error((data && data.error) || '登录失败')
      loadCaptcha()
    }
  } catch (e) {
    const msg = e.response && e.response.data && e.response.data.error
    ElMessage.error(msg || '登录失败')
    loadCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loadCaptcha()
  // 已登录用户直接进后台，避免停留在登录页
  try {
    const res = await checkSession()
    if (res && res.authenticated) {
      const target = props.redirect || route.query.redirect || '/admin'
      router.replace(target)
    }
  } catch (_) {}
})
</script>

<style scoped>
.login-wrap {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
}

/* 原背景图，铺满全屏 */
.login-bg {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  z-index: 0;
}

/* 渐变蒙版 + 轻微模糊，照片透出（还原 apple-admin.css 的 .login-modal::before） */
.login-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 20, 60, 0.32) 0%,
    rgba(0, 113, 227, 0.18) 55%,
    rgba(0, 0, 0, 0.30) 100%
  );
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  z-index: 1;
}

/* 毛玻璃卡片，浮在蒙版之上 */
.login-card {
  position: relative;
  z-index: 2;
  width: 400px;
  max-width: 100%;
  background: rgba(255, 255, 255, 0.94);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  padding: 4px 6px;
}

/* ============ 品牌区 ============ */
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 14px 0 26px;
  text-align: center;
}
.brand-logo {
  height: 64px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 80, 200, 0.18));
}
.brand-title {
  font-size: 24px;
  font-weight: 800;
  margin: 6px 0 0;
  letter-spacing: -0.02em;
  color: #1d1d1f;
}
.brand-sub {
  margin: 0;
  font-size: 13px;
  color: #6e6e73;
  letter-spacing: 0.2px;
}

/* ============ 表单字段 ============ */
.field {
  margin-bottom: 18px;
}
.field :deep(.el-form-item__label) {
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
  letter-spacing: 0.4px;
  padding-bottom: 6px;
  line-height: 1.2;
}
.field :deep(.el-input__wrapper) {
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(203, 213, 225, 0.9) inset;
  padding: 2px 14px;
  transition: box-shadow 0.18s ease, background 0.18s ease;
}
.field :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px #3D7CF4 inset, 0 0 0 4px rgba(61, 124, 244, 0.15);
}
.field :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.95) inset;
}
.field :deep(.el-input__inner) {
  height: 44px;
  font-size: 14px;
  color: #1f2937;
}
.field :deep(.el-input__inner::placeholder) {
  color: #9aa5b1;
}
/* 密码框显示/隐藏小眼睛 hover 色 */
.field :deep(.el-input__password) {
  color: #9aa5b1;
}
.field :deep(.el-input__password:hover) {
  color: #3D7CF4;
}

.captcha-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.captcha-box {
  flex: 0 0 auto;
  min-width: 108px;
  height: 44px;
  padding: 0 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 11px;
  cursor: pointer;
  user-select: none;
  position: relative;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, #0a84ff, #0066d6);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
}
.captcha-box::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.06) 2px, rgba(255,255,255,0.06) 4px),
    repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.05) 8px, rgba(255,255,255,0.05) 9px);
  pointer-events: none;
}
.captcha-box:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(10, 132, 255, 0.45);
}
.captcha-box.error {
  background: linear-gradient(135deg, #ff9f43, #f36c21);
  box-shadow: 0 4px 12px rgba(243, 108, 33, 0.32);
}
.captcha-box.error:hover {
  box-shadow: 0 6px 16px rgba(243, 108, 33, 0.42);
}
.captcha-box.loading {
  background: linear-gradient(135deg, #8e9aaf, #6b7280);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.28);
}
.captcha-code {
  position: relative;
  z-index: 1;
  font-weight: 800;
  font-size: 20px;
  font-family: 'SF Mono', 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  letter-spacing: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
.captcha-icon {
  position: relative;
  z-index: 1;
  font-size: 16px;
}
.captcha-hint {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.4px;
  opacity: 0.95;
}
@keyframes captcha-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: captcha-spin 1s linear infinite;
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
  height: 46px;
  font-size: 15px;
  letter-spacing: 6px;
  font-weight: 600;
  border-radius: 11px;
  background: linear-gradient(135deg, #3D7CF4, #2f6ae0);
  border: none;
  box-shadow: 0 8px 20px rgba(61, 124, 244, 0.32);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(61, 124, 244, 0.42);
}
.submit-btn:active {
  transform: translateY(0);
}

.login-foot {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: #9aa5b1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.login-foot i {
  color: #34c759;
  font-size: 13px;
}
</style>
