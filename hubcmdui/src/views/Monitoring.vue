<template>
  <div class="page mon-page">
    <div class="page-head mon-head">
      <div class="head-badge"><el-icon><Monitor /></el-icon></div>
      <div class="head-text">
        <h2>监控配置</h2>
        <p class="muted">容器停止监控与通知（企业微信 / Telegram）</p>
      </div>
      <div class="head-actions">
        <el-button type="primary" :loading="saving" @click="onSave"><el-icon><Check /></el-icon> 保存配置</el-button>
      </div>
    </div>

    <!-- 状态横幅 -->
    <div class="status-banner" :class="enabled ? 'on' : 'off'">
      <div class="sb-ico"><el-icon><Bell /></el-icon></div>
      <div class="sb-text">
        <div class="sb-title">{{ enabled ? '监控运行中' : '监控已暂停' }}</div>
        <div class="sb-sub">每 {{ form.monitorInterval }} 秒检测一次容器状态，异常时通过「{{ providerName }}」推送通知</div>
      </div>
      <el-switch
        v-model="enabled"
        :active-text="'启用'"
        :inactive-text="'停用'"
        inline-prompt
        :loading="toggling"
        @change="onToggle"
      />
    </div>

    <div class="mon-grid">
      <!-- 通知设置 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="sec-head"><el-icon><Bell /></el-icon><span>通知设置</span></div>
        </template>

        <div class="provider-label">通知方式</div>
        <div class="provider-cards">
          <div
            class="provider-card"
            :class="{ active: form.notificationType === 'wechat' }"
            role="radio"
            :aria-checked="form.notificationType === 'wechat'"
            tabindex="0"
            @click="form.notificationType = 'wechat'"
            @keyup.enter="form.notificationType = 'wechat'"
          >
            <div class="pc-ico wechat"><el-icon><ChatDotRound /></el-icon></div>
            <div class="pc-name">企业微信</div>
            <div class="pc-desc">通过群机器人 Webhook 推送</div>
            <el-icon v-if="form.notificationType === 'wechat'" class="pc-check"><CircleCheck /></el-icon>
          </div>

          <div
            class="provider-card"
            :class="{ active: form.notificationType === 'telegram' }"
            role="radio"
            :aria-checked="form.notificationType === 'telegram'"
            tabindex="0"
            @click="form.notificationType = 'telegram'"
            @keyup.enter="form.notificationType = 'telegram'"
          >
            <div class="pc-ico telegram"><el-icon><ChatLineRound /></el-icon></div>
            <div class="pc-name">Telegram</div>
            <div class="pc-desc">通过 Bot 发送私信通知</div>
            <el-icon v-if="form.notificationType === 'telegram'" class="pc-check"><CircleCheck /></el-icon>
          </div>
        </div>

        <el-form label-width="110px" class="mon-form">
          <el-form-item v-if="form.notificationType === 'wechat'" label="Webhook">
            <el-input v-model="form.webhookUrl" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...">
              <template #prefix><el-icon><Link /></el-icon></template>
            </el-input>
            <div class="field-hint">在企业微信「群聊 → 添加群机器人」后复制 Webhook 地址</div>
          </el-form-item>
          <template v-else>
            <el-form-item label="Bot Token">
              <el-input v-model="form.telegramToken" placeholder="123456:ABC-DEF1234..." />
              <div class="field-hint">向 @BotFather 创建机器人后获取 Token</div>
            </el-form-item>
            <el-form-item label="Chat ID">
              <el-input v-model="form.telegramChatId" placeholder="例如 -1001234567890" />
              <div class="field-hint">接收通知的会话 ID，可联系 @getidsbot 获取</div>
            </el-form-item>
          </template>
        </el-form>
      </el-card>

      <!-- 监控规则 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="sec-head"><el-icon><Timer /></el-icon><span>监控规则</span></div>
        </template>
        <el-form label-width="110px" class="mon-form">
          <el-form-item label="检测间隔">
            <el-input-number v-model="form.monitorInterval" :min="10" :max="3600" :step="10" controls-position="right" />
            <span class="unit">秒</span>
            <div class="field-hint">两次检测之间的间隔，建议 30 – 120 秒</div>
          </el-form-item>
        </el-form>
        <el-button class="test-btn" :loading="testing" @click="onTest">
          <el-icon><Promotion /></el-icon> 发送测试通知
        </el-button>
      </el-card>
    </div>

    <!-- 已停止的容器 -->
    <el-card shadow="never" class="section-card stopped">
      <template #header>
        <div class="sec-head">
          <el-icon><Warning /></el-icon><span>已停止的容器</span>
          <span v-if="stopped.length" class="count-badge">{{ stopped.length }}</span>
        </div>
      </template>
      <el-table :data="stopped" v-loading="loadingStopped" empty-text="暂无已停止的容器" class="admin-table">
        <el-table-column prop="name" label="容器" min-width="200" />
        <el-table-column prop="image" label="镜像" min-width="240" />
        <el-table-column label="状态" width="120">
          <template #default>
            <el-tag type="info" effect="light" round>
              <el-icon><VideoPlay /></el-icon> 已停止
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="restart(row.id)">
              <el-icon><VideoPlay /></el-icon> 启动
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Check, Monitor, Bell, CircleCheck, ChatDotRound, ChatLineRound, Link, Timer, Promotion, Warning, VideoPlay
} from '@element-plus/icons-vue'
import { getMonitoringConfig, saveMonitoringConfig, toggleMonitoring, testNotification, getStoppedContainersForMonitor, startContainer } from '../services'

const form = ref({ notificationType: 'wechat', webhookUrl: '', telegramToken: '', telegramChatId: '', monitorInterval: 60 })
const enabled = ref(false)
const saving = ref(false), toggling = ref(false), testing = ref(false)
const stopped = ref([]), loadingStopped = ref(false)

const providerName = computed(() => form.value.notificationType === 'wechat' ? '企业微信' : 'Telegram')

// 把后端/网络错误翻译成用户能看懂的中文提示
function describeError(e, ctx) {
  const data = e?.response?.data
  const status = e?.response?.status
  const be = data?.error || data?.message
  if (be) {
    if (status === 400) return `${ctx}配置有误：${be}`
    if (status === 401) return '登录状态已失效，请重新登录后再试'
    if (status === 500) return `${ctx}失败：${be}`
    return be
  }
  if (e?.message && /is not defined|is not a function/.test(e.message)) {
    return `${ctx}功能暂时不可用，请刷新页面或联系管理员`
  }
  if (!e?.response) return '网络异常，无法连接到服务器，请检查网络或稍后重试'
  return `${ctx}失败：${e.message || '未知错误'}`
}

async function load() {
  try {
    const c = await getMonitoringConfig()
    form.value = { ...form.value, ...c }
    enabled.value = !!c.isEnabled
  } catch (e) { ElMessage.warning(describeError(e, '读取监控配置')) }
  loadStopped()
}
async function loadStopped() {
  loadingStopped.value = true
  try { stopped.value = await getStoppedContainersForMonitor() } catch (e) {}
  finally { loadingStopped.value = false }
}
async function onSave() {
  saving.value = true
  try { await saveMonitoringConfig({ ...form.value, isEnabled: enabled.value }); ElMessage.success('配置已保存') }
  catch (e) { ElMessage.error(describeError(e, '保存配置')) }
  finally { saving.value = false }
}
async function onToggle(val) {
  toggling.value = true
  try { await toggleMonitoring(val); ElMessage.success(val ? '监控已启用' : '监控已禁用') }
  catch (e) { ElMessage.error(describeError(e, '切换监控')); enabled.value = !val }
  finally { toggling.value = false }
}
async function onTest() {
  if (testing.value) return
  testing.value = true
  try {
    await testNotification(form.value)
    ElMessage.success(`测试通知已发送，请前往「${providerName.value}」查收`)
  }
  catch (e) { ElMessage.error(describeError(e, '发送测试通知')) }
  finally { testing.value = false }
}
async function restart(id) {
  try { await startContainer(id); ElMessage.success('已启动容器'); loadStopped() }
  catch (e) { ElMessage.error(describeError(e, '启动容器')) }
}
onMounted(load)
</script>

<style scoped>
.mon-page { color: var(--fg); }
.page-head.mon-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.head-badge {
  width: 46px; height: 46px; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  border-radius: 13px; color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 8px 20px var(--accent-soft);
  font-size: 22px;
}
.head-text h2 { margin: 0 0 3px; font-size: 20px; letter-spacing: -0.01em; }
.head-text .muted { color: var(--muted); margin: 0; font-size: 13px; }
.head-actions { margin-left: auto; }

/* 状态横幅 */
.status-banner {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 14px;
  border: 1px solid var(--border); margin-bottom: 16px;
  background: var(--bg-card-2);
  transition: border-color .2s ease, background .2s ease;
}
.status-banner.on { border-color: color-mix(in srgb, var(--success) 40%, var(--border)); background: color-mix(in srgb, var(--success) 10%, var(--bg-card-2)); }
.status-banner.off { border-color: var(--border); }
.sb-ico { width: 42px; height: 42px; flex: 0 0 auto; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--bg-card); color: var(--accent); }
.status-banner.on .sb-ico { color: var(--success); }
.sb-text { flex: 1; min-width: 0; }
.sb-title { font-size: 15px; font-weight: 700; color: var(--fg); }
.sb-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* 分区网格 */
.mon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.section-card { background: var(--bg-card); border-color: var(--border); }
:deep(.el-card) { background: var(--bg-card); border-color: var(--border); }
.sec-head { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--fg); }
.sec-head .el-icon { color: var(--accent); }
.count-badge { margin-left: 6px; font-size: 12px; font-weight: 600; color: var(--muted); background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 999px; padding: 0 8px; }

/* 通知方式卡片选择器 */
.provider-label { font-size: 13px; font-weight: 600; color: var(--fg-2); margin-bottom: 10px; }
.provider-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
.provider-card {
  position: relative; cursor: pointer;
  border: 1.5px solid var(--border); border-radius: 12px;
  padding: 14px; background: var(--bg-card-2);
  transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease;
}
.provider-card:hover { transform: translateY(-2px); border-color: var(--border-strong); }
.provider-card.active { border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 6px 16px var(--accent-soft); }
.provider-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.pc-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; margin-bottom: 10px; }
.pc-ico.wechat { background: #07c160; }
.pc-ico.telegram { background: #229ed9; }
.pc-name { font-size: 14px; font-weight: 700; color: var(--fg); }
.pc-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
.pc-check { position: absolute; top: 10px; right: 10px; color: var(--accent); font-size: 18px; }

/* 表单 */
.mon-form { margin-top: 4px; }
.field-hint { font-size: 12px; color: var(--muted); line-height: 1.5; margin-top: 4px; }
.unit { margin-left: 8px; color: var(--muted); font-size: 13px; }
.test-btn { width: 100%; margin-top: 6px; }

.stopped { margin-top: 0; }

@media (max-width: 880px) {
  .mon-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .provider-card, .status-banner { transition: none; }
  .provider-card:hover { transform: none; }
}
</style>
