<template>
  <div class="page">
    <!-- 顶部标题栏 -->
    <div class="page-head">
      <div class="head-left">
        <h2>代理管理</h2>
        <p class="muted">在线管理镜像代理（注册表）与服务设置，无需手动编辑配置文件</p>
      </div>
      <div class="head-actions">
        <el-button
          :loading="refreshing"
          plain
          class="head-btn head-btn--ghost"
          @click="onRefresh"
        >
          <el-icon><Refresh /></el-icon>
          <span>刷新数据</span>
        </el-button>
        <el-popconfirm
          width="260"
          confirm-button-text="确认重载"
          cancel-button-text="取消"
          icon-color="#e6a23c"
          :icon="WarningFilled"
          title="重载会让 go-proxy 重新读取配置并刷新路由。是否继续？"
          @confirm="onReload"
        >
          <template #reference>
            <el-button
              :loading="reloading"
              type="warning"
              plain
              class="head-btn head-btn--warning"
            >
              <el-icon><RefreshRight /></el-icon>
              <span>重载服务</span>
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>

    <!-- ============ 服务器设置 ============ -->
    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-head">
          <div class="block-icon block-icon-server">
            <el-icon><Setting /></el-icon>
          </div>
          <div class="block-titles">
            <div class="block-title">服务设置</div>
            <div class="block-desc">配置代理监听地址、超时参数与默认注册表</div>
          </div>
        </div>
      </template>

      <el-form :model="serverForm" label-position="top" class="server-form">
        <el-form-item label="监听地址" required>
          <el-input v-model="serverForm.listen" placeholder="例如 :5000" />
          <div class="hint">代理对外提供服务的地址，例如 :5000</div>
        </el-form-item>
        <el-form-item label="默认注册表" required>
          <el-select v-model="serverForm.default" placeholder="未匹配到具体域名时使用" style="width: 100%">
            <el-option
              v-for="r in serverForm.registries"
              :key="r.name"
              :label="r.name"
              :value="r.name"
            />
          </el-select>
          <div class="hint">未匹配到具体域名时使用的注册表</div>
        </el-form-item>
        <el-form-item label="读取超时 (秒)" required>
          <el-input-number v-model="serverForm.readTimeout" :min="0" :step="1" style="width: 100%" />
          <div class="hint">代理读取上游超时时间，0 表示使用默认 60s</div>
        </el-form-item>
        <el-form-item label="写入超时 (秒)" required>
          <el-input-number v-model="serverForm.writeTimeout" :min="0" :step="1" style="width: 100%" />
          <div class="hint">代理写回客户端超时时间，0 表示不限制（流式传输需要）</div>
        </el-form-item>
        <el-form-item label="空闲超时 (秒)" required>
          <el-input-number v-model="serverForm.idleTimeout" :min="0" :step="1" style="width: 100%" />
          <div class="hint">连接空闲超时时间，0 表示使用默认 120s</div>
        </el-form-item>
      </el-form>

      <div class="block-actions">
        <el-button type="primary" :loading="serverSaving" @click="onSaveServer">
          <el-icon><Document /></el-icon> 保存服务器设置
        </el-button>
      </div>
    </el-card>

    <!-- ============ 注册表代理 ============ -->
    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-head">
          <div class="block-icon block-icon-reg">
            <el-icon><Box /></el-icon>
          </div>
          <div class="block-titles">
            <div class="block-title">注册表代理</div>
            <div class="block-desc">管理各个公共镜像仓库的代理规则</div>
          </div>
          <el-button type="primary" class="head-action" @click="onAddReg">
            <el-icon><Plus /></el-icon> 添加代理
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="serverForm.registries"
        :row-key="rowKey"
        stripe
        style="width: 100%"
        class="reg-table"
      >
        <el-table-column prop="name" label="名称" min-width="120">
          <template #default="{ row }">
            <span class="reg-name-cell">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="匹配域名 (HOSTS)" min-width="240">
          <template #default="{ row }">
            <div class="hosts-cell">
              <span v-for="(h, i) in row.hosts" :key="i" class="host-chip">{{ h }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="上游地址 (UPSTREAM)" min-width="240">
          <template #default="{ row }">
            <span class="upstream-cell">{{ row.upstream }}</span>
          </template>
        </el-table-column>
        <el-table-column label="认证方式" width="120">
          <template #default="{ row }">
            <span class="auth-cell">{{ authLabel(row.auth?.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="isEnabled(row)" type="success" effect="dark" size="small">已启用</el-tag>
            <el-tag v-else type="info" effect="plain" size="small">已禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button circle size="small" type="primary" plain @click="onEditReg(row)" title="编辑">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              circle
              size="small"
              :type="isEnabled(row) ? 'warning' : 'success'"
              plain
              @click="onToggleReg(row)"
              :title="isEnabled(row) ? '停用' : '启用'"
            >
              <el-icon><SwitchButton /></el-icon>
            </el-button>
            <el-button circle size="small" type="danger" plain @click="onDeleteReg(row)" title="删除">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无注册表代理，点击右上角「添加代理」开始" :image-size="80" />
        </template>
      </el-table>
    </el-card>

    <!-- ============ 编辑/添加代理对话框 ============ -->
    <el-dialog
      v-model="editVisible"
      width="640px"
      :show-close="false"
      :close-on-click-modal="false"
      align-center
      class="proxy-edit-dialog"
    >
      <template #header>
        <div class="dialog-banner">
          <div class="banner-row">
            <div class="banner-icon">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="banner-text">
              <h3 class="banner-title">
                {{ editIndex >= 0 ? '编辑代理' : '添加代理' }}
                <span v-if="editForm.name" class="banner-name">· {{ editForm.name }}</span>
              </h3>
              <p class="banner-subtitle">配置镜像代理的名称、域名映射、上游仓库与认证</p>
            </div>
            <span v-if="editIndex >= 0" class="banner-pill" :class="isEditEnabled === true ? 'pill-on' : (isEditEnabled === false ? 'pill-off' : '')">
              <el-icon><component :is="isEditEnabled ? CircleCheck : CircleClose" /></el-icon>
              {{ isEditEnabled ? '已启用' : '已禁用' }}
            </span>
            <span v-else class="banner-pill pill-new">
              <el-icon><Plus /></el-icon> 新建
            </span>
          </div>
        </div>
      </template>

      <div class="dialog-body">
        <!-- ====== 基本信息 ====== -->
        <div class="form-section">
          <div class="form-section-title">
            <span class="section-icon section-icon--info"><el-icon><Box /></el-icon></span>
            <span>基本信息</span>
            <span class="section-meta">必填</span>
          </div>
          <div class="form-grid two">
            <div class="form-group">
              <label class="form-label">
                代理名称 <span class="req">*</span>
              </label>
              <el-input v-model="editForm.name" size="large" placeholder="例如：dockerhub" class="form-input" />
              <p class="form-hint">唯一标识，用于区分不同代理</p>
            </div>
            <div class="form-group">
              <label class="form-label">
                上游地址 <span class="req">*</span>
              </label>
              <el-input v-model="editForm.upstream" size="large" placeholder="例如：https://registry-1.docker.io" class="form-input" />
              <p class="form-hint">真实镜像仓库地址，必须 http(s):// 开头</p>
            </div>
            <div class="form-group full">
              <label class="form-label">
                匹配域名 (Hosts) <span class="req">*</span>
              </label>
              <el-input
                v-model="editForm.hostsText"
                type="textarea"
                :rows="2"
                placeholder="多个域名用逗号分隔，例如：hub.your_domain_name, registry-1.docker.io"
                class="form-input form-textarea"
              />
              <p class="form-hint">客户端拉取这些域名时走此代理</p>
            </div>
          </div>
        </div>

        <!-- ====== 认证 & 安全 ====== -->
        <div class="form-section">
          <div class="form-section-title">
            <span class="section-icon section-icon--auth"><el-icon><Lock /></el-icon></span>
            <span>认证 & 安全</span>
            <span class="section-meta">可选</span>
          </div>
          <div class="form-grid two">
            <div class="form-group">
              <label class="form-label">认证方式</label>
              <el-select v-model="editForm.auth.type" size="large" class="form-input" style="width: 100%">
                <el-option label="Token (Bearer，默认)" value="token" />
                <el-option label="Basic 认证" value="basic" />
                <el-option label="匿名" value="anonymous" />
              </el-select>
              <p class="form-hint">调用上游仓库时的身份验证方式</p>
            </div>
            <div class="form-group">
              <label class="form-label">Token 缓存 (秒)</label>
              <el-input-number v-model="editForm.tokenCacheTTL" :min="0" :step="300" size="large" class="form-input" style="width: 100%" />
              <p class="form-hint">0 表示不缓存</p>
            </div>
            <div class="form-group">
              <label class="form-label">用户名</label>
              <el-input v-model="editForm.auth.username" placeholder="Basic 认证用户名（可选）" size="large" class="form-input" />
              <p class="form-hint">仅 Basic 认证时使用</p>
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <el-input
                v-model="editForm.auth.password"
                type="password"
                show-password
                placeholder="Basic 认证密码（可选）"
                size="large"
                class="form-input"
              />
              <p class="form-hint">编辑模式留空表示保留原密码</p>
            </div>
          </div>

          <div class="toggle-row toggle-row--warning">
            <div class="toggle-left">
              <div class="form-label toggle-label">
                <el-icon class="toggle-warn-icon"><WarningFilled /></el-icon>
                跳过 TLS 证书校验
              </div>
              <p class="form-hint">自签 / 内部证书环境使用，存在安全风险</p>
            </div>
            <el-switch v-model="editForm.insecureSkipVerify" class="toggle-switch" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button size="large" plain @click="editVisible = false">取消</el-button>
          <el-button type="primary" size="large" :loading="editSaving" @click="onSaveReg">
            <el-icon><Document /></el-icon> 保存配置
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, RefreshRight, Setting, Box, Document, Edit, SwitchButton, Delete, Plus,
  Connection, EditPen, Compass, Link, Lock, Key, Clock, User, WarningFilled, CircleCheck, CircleClose
} from '@element-plus/icons-vue'
import { getGoConfig, saveGoConfig, reloadGoProxy, goProxyStatus } from '../services'

// 表单数据 = 完整的 Go 端 Config（含 server + default + registries[]）
const serverForm = reactive({
  listen: ':5000',
  default: '',
  readTimeout: 60,
  writeTimeout: 0,
  idleTimeout: 120,
  logLevel: 'normal',
  registries: []
})

const loading = ref(false)
const refreshing = ref(false)
const reloading = ref(false)
const serverSaving = ref(false)
const status = ref(null)

function authLabel(t) {
  if (t === 'token') return 'token'
  if (t === 'basic') return 'basic'
  if (t === 'anonymous') return 'anonymous'
  return t || '—'
}

function isEnabled(r) {
  if (r.enabled === undefined || r.enabled === null) return true
  return !!r.enabled
}

function rowKey(row) {
  return row.name
}

async function load() {
  loading.value = true
  try {
    const c = await getGoConfig()
    applyConfig(c)
  } catch (e) {
    ElMessage.error('读取配置失败：' + (e.response?.data?.error || e.message))
  } finally {
    loading.value = false
  }
  try {
    status.value = await goProxyStatus()
  } catch (e) {
    status.value = { reachable: false }
  }
}

function applyConfig(c) {
  if (!c) return
  // 兼容后端可能不返回的字段
  const s = c.server || {}
  serverForm.listen = s.listen || ':5000'
  serverForm.readTimeout = typeof s.read_timeout === 'number' ? s.read_timeout : 60
  serverForm.writeTimeout = typeof s.write_timeout === 'number' ? s.write_timeout : 0
  serverForm.idleTimeout = typeof s.idle_timeout === 'number' ? s.idle_timeout : 120
  serverForm.logLevel = c.log_level || 'normal'
  serverForm.default = c.default || ''
  serverForm.registries = (Array.isArray(c.registries) ? c.registries : []).map(r => ({
    name: r.name || '',
    hosts: Array.isArray(r.hosts) ? r.hosts : [],
    upstream: r.upstream || '',
    auth: {
      type: r.auth?.type || 'token',
      username: r.auth?.username || '',
      password: '' // 后端会把密码脱敏为 ********，编辑模式下传回原值
    },
    tokenCacheTTL: typeof r.token_cache_ttl === 'number' ? r.token_cache_ttl : 3600,
    insecureSkipVerify: !!r.insecure_skip_verify,
    enabled: r.enabled === undefined ? true : !!r.enabled
  }))
}

function buildPayload() {
  return {
    server: {
      listen: serverForm.listen,
      read_timeout: Number(serverForm.readTimeout) || 0,
      write_timeout: Number(serverForm.writeTimeout) || 0,
      idle_timeout: Number(serverForm.idleTimeout) || 0
    },
    default: serverForm.default,
    log_level: serverForm.logLevel,
    registries: serverForm.registries.map(r => ({
      name: r.name,
      hosts: Array.isArray(r.hosts) ? r.hosts : [],
      upstream: r.upstream,
      auth: {
        type: r.auth?.type || 'token',
        username: r.auth?.username || '',
        password: r.auth?.password || '' // 后端识别 ******** 时保留原密码
      },
      token_cache_ttl: Number(r.tokenCacheTTL) || 3600,
      insecure_skip_verify: !!r.insecureSkipVerify,
      enabled: !!r.enabled
    }))
  }
}

async function persist() {
  if (!serverForm.registries.length) {
    throw new Error('请至少保留一个注册表代理')
  }
  if (!serverForm.listen) throw new Error('请填写监听地址')
  if (serverForm.default && !serverForm.registries.some(r => r.name === serverForm.default)) {
    throw new Error('默认注册表必须在已配置的代理列表中')
  }
  await saveGoConfig(buildPayload())
  await load() // 重新拉取，后端会把密码脱敏
}

async function onSaveServer() {
  serverSaving.value = true
  try {
    await persist()
    ElMessage.success('服务器设置已保存')
  } catch (e) {
    ElMessage.error('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    serverSaving.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  try {
    await load()
    ElMessage.success('已刷新')
  } finally {
    refreshing.value = false
  }
}

async function onReload() {
  reloading.value = true
  try {
    const r = await reloadGoProxy()
    ElMessage.success((r && r.message) || '已重新加载')
    await load()
  } catch (e) {
    ElMessage.error('重载失败：' + (e.response?.data?.error || e.message))
  } finally {
    reloading.value = false
  }
}

// ===== 注册表代理 CRUD =====
const editVisible = ref(false)
const editSaving = ref(false)
const editIndex = ref(-1)
const editForm = reactive({
  name: '',
  hostsText: '',
  upstream: '',
  auth: { type: 'token', username: '', password: '' },
  tokenCacheTTL: 3600,
  insecureSkipVerify: false
})

function fillEditFromRow(r) {
  editForm.name = r.name || ''
  editForm.hostsText = (Array.isArray(r.hosts) ? r.hosts : []).join(', ')
  editForm.upstream = r.upstream || ''
  editForm.auth = {
    type: r.auth?.type || 'token',
    username: r.auth?.username || '',
    password: '' // 不回填密码，留空表示不修改
  }
  editForm.tokenCacheTTL = r.tokenCacheTTL || 3600
  editForm.insecureSkipVerify = !!r.insecureSkipVerify
}

// 编辑弹窗中显示的「当前代理启用状态」：新增时为 null
const isEditEnabled = computed(() => {
  if (editIndex.value < 0) return null
  const r = serverForm.registries[editIndex.value]
  return r ? isEnabled(r) : null
})

function onEditReg(row) {
  editIndex.value = serverForm.registries.findIndex(r => r.name === row.name)
  fillEditFromRow(row)
  editVisible.value = true
}

function onAddReg() {
  editIndex.value = -1
  fillEditFromRow({
    name: '',
    hosts: [],
    upstream: '',
    auth: { type: 'token' }
  })
  editVisible.value = true
}

function parseHosts(text) {
  return (text || '')
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function validateEdit() {
  if (!editForm.name) return '请填写代理名称'
  if (!/^[a-zA-Z0-9_\-]+$/.test(editForm.name)) {
    return '代理名称仅支持字母、数字、下划线、连字符'
  }
  const dup = serverForm.registries.findIndex((r, i) => r.name === editForm.name && i !== editIndex.value)
  if (dup >= 0) return '代理名称重复'
  if (!editForm.upstream) return '请填写上游地址'
  if (!/^https?:\/\//.test(editForm.upstream)) return '上游地址必须以 http(s):// 开头'
  if (!parseHosts(editForm.hostsText).length) return '请填写至少一个匹配域名'
  return null
}

async function onSaveReg() {
  const err = validateEdit()
  if (err) {
    ElMessage.warning(err)
    return
  }
  editSaving.value = true
  try {
    const newReg = {
      name: editForm.name,
      hosts: parseHosts(editForm.hostsText),
      upstream: editForm.upstream,
      auth: {
        type: editForm.auth.type,
        username: editForm.auth.username || '',
        password: editForm.auth.password || ''
      },
      tokenCacheTTL: Number(editForm.tokenCacheTTL) || 0,
      insecureSkipVerify: !!editForm.insecureSkipVerify,
      enabled: true
    }
    if (editIndex.value < 0) {
      // 新增
      serverForm.registries.push(newReg)
    } else {
      // 编辑：保留原 enabled 状态、密码（如果留空）
      const orig = serverForm.registries[editIndex.value]
      newReg.enabled = orig.enabled
      if (!editForm.auth.password) {
        newReg.auth.password = orig.auth?.password || ''
      }
      serverForm.registries.splice(editIndex.value, 1, newReg)
    }
    await persist()
    editVisible.value = false
    ElMessage.success('代理配置已保存')
  } catch (e) {
    ElMessage.error('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    editSaving.value = false
  }
}

async function onToggleReg(row) {
  const i = serverForm.registries.findIndex(r => r.name === row.name)
  if (i < 0) return
  const newEnabled = !isEnabled(serverForm.registries[i])
  const action = newEnabled ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(
      `确认${action}代理「${row.name}」？`,
      `${action}代理`,
      { type: 'warning' }
    )
  } catch { return }
  serverForm.registries[i].enabled = newEnabled
  try {
    await persist()
    ElMessage.success(`已${action}「${row.name}」`)
  } catch (e) {
    ElMessage.error(`${action}失败：${e.response?.data?.error || e.message}`)
  }
}

async function onDeleteReg(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除代理「${row.name}」？此操作不可恢复`,
      '删除代理',
      { type: 'warning' }
    )
  } catch { return }
  const i = serverForm.registries.findIndex(r => r.name === row.name)
  if (i < 0) return
  serverForm.registries.splice(i, 1)
  // 如果删的是默认注册表，重置 default
  if (serverForm.default === row.name) {
    serverForm.default = serverForm.registries[0]?.name || ''
  }
  try {
    await persist()
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error('删除失败：' + (e.response?.data?.error || e.message))
  }
}

onMounted(load)
</script>

<style scoped>
.page { color: var(--fg); }
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}
.page-head h2 { margin: 0 0 4px; color: var(--fg); font-size: 20px; }
.muted { color: var(--muted); margin: 0; font-size: 13px; }
.head-actions { display: flex; gap: 10px; align-items: center; }
.head-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-weight: 500;
}
.head-btn .el-icon { font-size: 14px; }
.head-btn--ghost {
  color: var(--fg-2);
  background: var(--bg-card-2);
  border-color: var(--border);
}
.head-btn--ghost:hover {
  color: var(--accent);
  background: var(--bg-card);
  border-color: var(--accent);
}
.head-btn--warning {
  --el-button-bg-color: color-mix(in srgb, #e6a23c 10%, var(--bg-card));
}

.block {
  background: var(--bg-card);
  border-color: var(--border);
  margin-bottom: 16px;
}
.block-head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.block-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px;
  flex-shrink: 0;
}
.block-icon-server { background: linear-gradient(135deg, #4a8cff, #3D7CF4); }
.block-icon-reg { background: linear-gradient(135deg, #6a82fb, #5b6cd9); }
.block-titles { flex: 1; min-width: 0; }
.block-title { font-size: 16px; font-weight: 600; color: var(--fg); }
.block-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
.head-action { margin-left: auto; }
.block-actions { display: flex; justify-content: flex-end; margin-top: 18px; }

.server-form { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.server-form .el-form-item { margin-bottom: 0; }
.server-form .el-form-item :deep(.el-form-item__label) { font-weight: 500; color: var(--fg-2); padding-bottom: 4px; }
.hint { color: var(--muted); font-size: 12px; margin-top: 4px; line-height: 1.4; }

.reg-table :deep(.el-table__row) { color: var(--fg); }
.reg-name-cell { font-weight: 500; color: var(--fg); }
.hosts-cell { display: flex; flex-wrap: wrap; gap: 4px; }
.host-chip {
  display: inline-block;
  background: rgba(61, 124, 244, .08);
  color: #3D7CF4;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  word-break: break-all;
}
.upstream-cell { color: #e25c5c; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; word-break: break-all; }
.auth-cell { font-size: 12px; color: var(--muted); }

/* ============ 编辑/添加代理对话框 ============ */
:deep(.proxy-edit-dialog) {
  border-radius: 20px;
  overflow: hidden;
  padding: 0;
  background: var(--bg-card) !important;
}
:deep(.proxy-edit-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 55%, #f093fb 100%);
}
:deep(.proxy-edit-dialog .el-dialog__body) { padding: 22px 28px 8px; }
:deep(.proxy-edit-dialog .el-dialog__footer) {
  padding: 14px 28px 22px;
  border-top: 1px solid var(--border);
  margin-top: 0;
  background: var(--bg-card-2);
}
:deep(.proxy-edit-dialog .el-dialog__body .dialog-footer) { display: none; }

/* 顶部 banner */
.dialog-banner {
  position: relative;
  padding: 22px 24px 20px;
  color: #fff;
  overflow: hidden;
}
.dialog-banner::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(60% 80% at 12% 0%, rgba(255,255,255,.22), transparent 60%),
    radial-gradient(70% 60% at 100% 100%, rgba(240,147,251,.18), transparent 60%),
    radial-gradient(40% 40% at 50% 50%, rgba(255,255,255,.08), transparent 70%);
  pointer-events: none;
}
.dialog-banner::after {
  /* 网格点状装饰 */
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(255,255,255,.18) 1px, transparent 1px);
  background-size: 22px 22px;
  background-position: 0 0;
  opacity: .35;
  mask-image: linear-gradient(180deg, #000 0%, transparent 90%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, transparent 90%);
  pointer-events: none;
}
.banner-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
}
.banner-icon {
  width: 48px; height: 48px;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 14px;
  display: inline-flex;
  align-items: center; justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.10);
}
.banner-text {
  flex: 1;
  min-width: 0;
}
.banner-title {
  color: #fff;
  font-size: 19px;
  font-weight: 700;
  margin: 0 0 3px;
  letter-spacing: .01em;
  line-height: 1.3;
}
.banner-name { opacity: 0.9; font-weight: 500; }
.banner-subtitle {
  color: rgba(255, 255, 255, 0.86);
  font-size: 12.5px;
  margin: 0;
  line-height: 1.4;
}
.banner-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 999px;
  font-size: 12px; font-weight: 600;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.28);
  white-space: nowrap;
  flex-shrink: 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.banner-pill .el-icon { font-size: 12px; }
.banner-pill.pill-on  { background: rgba(34, 197, 94, 0.32);  border-color: rgba(187, 247, 208, 0.55); }
.banner-pill.pill-off { background: rgba(245, 158, 11, 0.32); border-color: rgba(253, 224, 71, 0.55); }
.banner-pill.pill-new { background: rgba(255, 255, 255, 0.22); }

/* 表单分区（卡片化） */
.form-section {
  position: relative;
  background: var(--bg-card-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px 20px;
  margin-bottom: 18px;
  overflow: hidden;
}
.form-section::before {
  /* 左侧 accent 边条 */
  content: '';
  position: absolute;
  left: 0; top: 14px; bottom: 14px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--accent), var(--accent-2));
}
.form-section:last-child { margin-bottom: 0; }

.form-section-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 16px;
  letter-spacing: 0;
}
.section-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
  border-radius: 8px;
  font-size: 14px;
  flex-shrink: 0;
}
.section-icon--info {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent);
}
.section-icon--auth {
  background: rgba(99, 102, 241, 0.14);
  color: var(--accent-2);
}
.section-meta {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  padding: 2px 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 999px;
}

/* 表单两列网格 */
.form-grid { display: grid; gap: 18px; }
.form-grid.two { grid-template-columns: 1fr 1fr; }
.form-grid .form-group.full { grid-column: 1 / -1; }
.form-group { min-width: 0; }

/* 标签 */
.form-label {
  display: flex; align-items: center; gap: 4px;
  font-size: 13.5px; font-weight: 600;
  color: var(--fg);
  margin-bottom: 8px;
  letter-spacing: .01em;
}
.form-label .req { color: #f56c6c; margin-left: 1px; font-weight: 700; }

/* 输入控件统一圆角 + focus 态 */
.form-input :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--border) inset;
  background: var(--bg-card);
  transition: box-shadow .18s ease, background .18s ease;
}
.form-input :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px #b6c2d8 inset; }
.form-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.55) inset, 0 0 0 4px rgba(99, 102, 241, 0.12);
}
.form-textarea :deep(.el-textarea__inner) {
  border-radius: 10px;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px;
  background: var(--bg-card);
  box-shadow: 0 0 0 1px var(--border) inset;
  transition: box-shadow .18s ease;
}
.form-textarea :deep(.el-textarea__inner:focus) {
  background: var(--bg-card);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.55) inset, 0 0 0 4px rgba(99, 102, 241, 0.12);
}

/* 提示文字 */
.form-hint {
  color: var(--muted);
  font-size: 12px;
  margin: 7px 0 0;
  line-height: 1.5;
  letter-spacing: .01em;
}

/* 开关行（TLS 跳过校验） */
.toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 12px;
  position: relative;
  transition: border-color .18s ease, background .18s ease;
}
.toggle-row--warning {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.32);
}
.toggle-row--warning::before {
  content: '';
  position: absolute;
  left: 0; top: 8px; bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #f59e0b, #ef4444);
}
.toggle-left { flex: 1; min-width: 0; padding-left: 8px; }
.toggle-left .toggle-label { margin: 0; }
.toggle-left .form-hint { margin-top: 4px; }
.toggle-warn-icon {
  color: #f59e0b;
  font-size: 15px;
  margin-right: 2px;
}
.toggle-switch :deep(.el-switch__core) { border-color: var(--border-strong); }

/* 底部按钮 */
.dialog-footer {
  display: flex; gap: 12px; justify-content: flex-end;
  align-items: center;
}
.dialog-footer .el-button {
  border-radius: 10px;
  font-weight: 600;
  padding-left: 22px;
  padding-right: 22px;
}

@media (max-width: 1100px) {
  .server-form { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
  .server-form { grid-template-columns: 1fr; }
  .page-head { flex-direction: column; align-items: flex-start; }
  .form-grid.two { grid-template-columns: 1fr; }
  .banner-row { flex-wrap: wrap; }
  .banner-pill { margin-left: auto; }
}
</style>
