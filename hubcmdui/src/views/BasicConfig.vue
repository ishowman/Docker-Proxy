<template>
  <div class="page page-config">
    <div class="page-head">
      <div>
        <h2>基本配置</h2>
        <p class="muted">配置前台 Logo 与各 Registry 平台的启用 / 代理地址</p>
      </div>
    </div>

    <!-- ============ Logo 设置 ============ -->
    <el-card shadow="never" class="section-card">
      <div class="section-head">
        <div class="section-icon icon-logo">
          <el-icon><Picture /></el-icon>
        </div>
        <div style="flex: 1;">
          <div class="section-title">Logo 设置</div>
          <div class="muted">自定义系统 Logo 图片（前台 / 后台头部展示）</div>
        </div>
        <el-button type="primary" :loading="loadingLogo" @click="onSaveLogo">
          <el-icon><Check /></el-icon> 保存 Logo
        </el-button>
      </div>

      <el-form label-width="100px" class="logo-form">
        <el-form-item label="Logo URL">
          <el-input
            v-model="logoForm.logoUrl"
            placeholder="请输入 Logo 图片 URL（可选）"
            clearable
          />
        </el-form-item>
        <div class="muted small">支持 PNG、JPG、SVG 格式的图片链接</div>
        <div v-if="logoForm.logoUrl" class="logo-preview">
          <img :src="logoForm.logoUrl" alt="logo preview" @error="onLogoError" />
        </div>
      </el-form>
    </el-card>

    <!-- ============ Registry 平台配置 ============ -->
    <el-card shadow="never" class="section-card">
      <div class="section-head">
        <div class="section-icon icon-reg">
          <el-icon><Files /></el-icon>
        </div>
        <div style="flex: 1;">
          <div class="section-title">Registry 平台配置</div>
          <div class="muted">每个 Registry 独立配置并独立保存；启用时必须填写代理地址</div>
        </div>
      </div>

      <div v-loading="loadingReg" class="registry-grid">
        <div
          v-for="r in registries"
          :key="r.registryId"
          class="reg-card"
          :class="{ disabled: !r.enabled, 'no-proxy': !r.proxyUrl }"
        >
          <!-- 卡片头：图标 + 名称 + 状态 -->
          <div class="reg-head">
            <div class="reg-icon" :style="{ background: r.color || '#3b82f6' }">
              <i v-if="r.iconClass" :class="r.iconClass" />
              <el-icon v-else><Box /></el-icon>
            </div>
            <div class="reg-meta">
              <div class="reg-name">{{ r.name }}</div>
              <div class="reg-domain">{{ r.prefix || r.registryId }}</div>
            </div>
            <div class="reg-status" :class="r.enabled ? 'on' : 'off'">
              <span class="dot"></span>
              <span>{{ r.enabled ? '已启用' : '已禁用' }}</span>
            </div>
          </div>

          <div class="reg-desc">{{ r.description || '—' }}</div>

          <!-- 启用开关 -->
          <div class="reg-row">
            <span class="row-label">启用</span>
            <el-switch
              v-model="r.enabled"
              :active-color="r.color || '#22c55e'"
              :disabled="!r.proxyUrl && !r.enabled"
              @change="(v) => onToggle(r, v)"
            />
          </div>
          <div v-if="!r.enabled && !r.proxyUrl" class="row-hint warn">
            <i class="fas fa-exclamation-triangle"></i> 请先填写代理地址，再启用
          </div>

          <!-- 代理地址 -->
          <div class="reg-row">
            <span class="row-label">
              代理地址
              <el-tag size="small" type="danger" effect="plain" class="req-tag">必填</el-tag>
            </span>
          </div>
          <el-input
            v-model="r.proxyUrl"
            :placeholder="`例如：${r.registryId}.proxy.example.com`"
            clearable
            class="reg-input"
          />
          <div class="row-hint">填写此 Registry 的代理服务地址</div>

          <!-- 卡片底部：独立保存按钮 -->
          <div class="reg-foot">
            <el-button
              type="primary"
              :loading="savingId === r.registryId"
              :disabled="!canSave(r)"
              @click="onSaveOne(r)"
              class="save-btn"
            >
              <el-icon><Check /></el-icon> 保存
            </el-button>
            <span v-if="!r.proxyUrl" class="empty-warn">
              <i class="fas fa-info-circle"></i> 代理地址为空
            </span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture, Check, Box, Files } from '@element-plus/icons-vue'
import {
  getConfig,
  saveConfig,
  getRegistryConfigs,
  updateRegistryConfig
} from '../services'

const logoForm = ref({ logoUrl: '' })
const registries = ref([])
const loadingReg = ref(false)
const loadingLogo = ref(false)
const savingId = ref(null)

async function loadLogo() {
  try {
    const cfg = await getConfig()
    logoForm.value.logoUrl = (cfg && cfg.logo) || ''
  } catch (e) {
    // 静默失败（容错）
  }
}

async function loadRegistries() {
  loadingReg.value = true
  try {
    const list = await getRegistryConfigs()
    registries.value = (list || []).map((r) => ({
      ...r,
      registryId: r.registryId || r.registry_id,
      proxyUrl: r.proxyUrl || r.proxy_url || '',
      iconClass: r.iconClass || r.icon,
      enabled: !!r.enabled
    }))
  } catch (e) {
    ElMessage.warning('加载 Registry 失败：' + (e.response?.data?.error || e.message))
  } finally {
    loadingReg.value = false
  }
}

function canSave(r) {
  // 不允许空地址保存（不论是否启用）
  if (!r.proxyUrl || !r.proxyUrl.trim()) return false
  return true
}

function onToggle(r, val) {
  // 启用时强制校验：地址为空时拒绝启用并弹窗
  if (val && (!r.proxyUrl || !r.proxyUrl.trim())) {
    r.enabled = false
    ElMessageBox.alert(
      `请先填写「${r.name}」的代理地址，然后再启用该 Registry。`,
      '无法启用',
      { type: 'warning', confirmButtonText: '我知道了' }
    )
  }
}

function onLogoError(e) {
  e.target.style.display = 'none'
  ElMessage.warning('Logo 图片加载失败，请检查 URL')
}

async function onSaveLogo() {
  loadingLogo.value = true
  try {
    const cfg = await getConfig().catch(() => ({}))
    const next = { ...(cfg || {}), logo: logoForm.value.logoUrl || '' }
    await saveConfig(next)
    ElMessage.success('Logo 已保存')
  } catch (e) {
    ElMessage.error('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    loadingLogo.value = false
  }
}

async function onSaveOne(r) {
  // 防御性校验：地址为空时弹窗拒绝
  if (!r.proxyUrl || !r.proxyUrl.trim()) {
    ElMessageBox.alert(
      `「${r.name}」的代理地址为空，请填写后再保存。`,
      '无法保存',
      { type: 'warning', confirmButtonText: '我知道了' }
    )
    return
  }
  savingId.value = r.registryId
  try {
    await updateRegistryConfig(r.registryId, {
      enabled: !!r.enabled,
      proxyUrl: r.proxyUrl.trim()
    })
    ElMessage.success(`「${r.name}」已保存`)
  } catch (e) {
    ElMessage.error('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    savingId.value = null
  }
}

onMounted(() => {
  loadLogo()
  loadRegistries()
})
</script>

<style scoped>
.page-config { color: var(--fg); }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
.page-head h2 { margin: 0 0 4px; font-size: 20px; color: var(--fg); }
.muted { color: var(--muted); margin: 0; font-size: 13px; }
.muted.small { font-size: 12px; margin-top: -10px; margin-bottom: 12px; }

.section-card { background: var(--bg-card); border-color: var(--border); margin-bottom: 16px; }
.section-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.section-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; flex-shrink: 0; }
.icon-logo { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.icon-reg { background: linear-gradient(135deg, #06b6d4, #3b82f6); }
.section-title { font-size: 16px; font-weight: 600; color: var(--fg); }

.logo-form { max-width: 720px; }
.logo-preview { margin-top: 12px; padding: 16px; background: var(--bg-card-2); border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); }
.logo-preview img { max-height: 64px; max-width: 200px; object-fit: contain; }

.registry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.reg-card {
  background: var(--bg-card-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}
.reg-card:hover { border-color: var(--border-strong); transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.reg-card.disabled { opacity: 0.75; }
.reg-card.no-proxy { border-style: dashed; }

.reg-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.reg-icon {
  width: 42px; height: 42px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 22px; flex-shrink: 0;
}
.reg-meta { flex: 1; min-width: 0; }
.reg-name { font-weight: 600; color: var(--fg); font-size: 14px; line-height: 1.2; }
.reg-domain { color: var(--muted); font-size: 12px; margin-top: 2px; font-family: ui-monospace, "SF Mono", Menlo, monospace; }

.reg-status { display: flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.reg-status .dot { width: 6px; height: 6px; border-radius: 50%; }
.reg-status.on { background: rgba(34, 197, 94, .12); color: #4ade80; }
.reg-status.on .dot { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
.reg-status.off { background: rgba(239, 68, 68, .12); color: #f87171; }
.reg-status.off .dot { background: #f87171; }

.reg-desc { color: var(--muted); font-size: 12px; margin-bottom: 14px; line-height: 1.4; }

.reg-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.row-label { font-size: 13px; color: var(--fg-2); display: flex; align-items: center; gap: 6px; }
.req-tag { transform: scale(.85); }

.reg-input :deep(.el-input__wrapper) { background: var(--bg-input); }
.reg-input :deep(.el-input__inner) { color: var(--fg); }

.row-hint { color: var(--muted-2); font-size: 11px; margin-top: 4px; }
.row-hint.warn { color: #f59e0b; }

.reg-foot {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.save-btn { flex: 1; }
.empty-warn {
  font-size: 12px;
  color: #f59e0b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
