<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>监控配置</h2>
        <p class="muted">容器停止监控与通知（企业微信 / Telegram）</p>
      </div>
      <div>
        <el-switch
          v-model="enabled"
          active-text="监控已启用"
          inactive-text="监控已禁用"
          inline-prompt
          @change="onToggle"
          :loading="toggling"
        />
        <el-button type="primary" :loading="saving" @click="onSave"><el-icon><Check /></el-icon> 保存配置</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-form label-width="130px">
        <el-form-item label="通知方式">
          <el-radio-group v-model="form.notificationType">
            <el-radio value="wechat">企业微信</el-radio>
            <el-radio value="telegram">Telegram</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.notificationType === 'wechat'" label="Webhook URL">
          <el-input v-model="form.webhookUrl" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
        </el-form-item>
        <template v-else>
          <el-form-item label="Bot Token"><el-input v-model="form.telegramToken" /></el-form-item>
          <el-form-item label="Chat ID"><el-input v-model="form.telegramChatId" /></el-form-item>
        </template>
        <el-form-item label="监控间隔(秒)">
          <el-input v-model.number="form.monitorInterval" type="number" style="width:160px" />
        </el-form-item>
        <el-form-item>
          <el-button @click="onTest"><el-icon><Promotion /></el-icon> 发送测试通知</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="stopped">
      <template #header><span>已停止的容器</span></template>
      <el-table :data="stopped" v-loading="loadingStopped" empty-text="暂无已停止的容器">
        <el-table-column prop="name" label="容器" min-width="200" />
        <el-table-column prop="image" label="镜像" min-width="240" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="restart(row.id)"><el-icon><VideoPlay /></el-icon> 启动</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Promotion, VideoPlay } from '@element-plus/icons-vue'
import { getMonitoringConfig, saveMonitoringConfig, toggleMonitoring, testNotification, getStoppedContainersForMonitor, startContainer } from '../services'

const form = ref({ notificationType: 'wechat', webhookUrl: '', telegramToken: '', telegramChatId: '', monitorInterval: 60 })
const enabled = ref(false)
const saving = ref(false), toggling = ref(false), testing = ref(false)
const stopped = ref([]), loadingStopped = ref(false)

// 把后端/网络错误翻译成用户能看懂的中文提示
function describeError(e, ctx) {
  const data = e?.response?.data
  const status = e?.response?.status
  const be = data?.error || data?.message
  // 后端返回的友好文案（如「企业微信通知需要设置 webhook URL」）
  if (be) {
    if (status === 400) return `${ctx}配置有误：${be}`
    if (status === 401) return '登录状态已失效，请重新登录后再试'
    if (status === 500) return `${ctx}失败：${be}`
    return be
  }
  // 前端代码层面的异常（例如接口未正确引入）
  if (e?.message && /is not defined|is not a function/.test(e.message)) {
    return `${ctx}功能暂时不可用，请刷新页面或联系管理员`
  }
  // 没有 response 通常是网络问题（连不上后端）
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
    const where = form.value.notificationType === 'wechat' ? '企业微信' : 'Telegram'
    ElMessage.success(`测试通知已发送，请前往「${where}」查收`)
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
.page { color: var(--fg); }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-head h2 { margin: 0 0 4px; }
.muted { color: var(--muted); margin: 0; font-size: 13px; }
.stopped { margin-top: 16px; }
:deep(.el-card) { background: var(--bg-card); border-color: var(--border); }
:deep(.el-table) { background: var(--bg-card); }
:deep(.el-table tr),
:deep(.el-table td) { background: var(--bg-card) !important; color: var(--fg) !important; border-bottom-color: var(--border) !important; }
:deep(.el-table th.el-table__cell) { background: var(--bg-card-2) !important; color: var(--fg-2) !important; font-weight: 600; }
:deep(.el-table__row:hover > td) { background: var(--bg-hover) !important; }
</style>
