<template>
  <div class="docker-view">
    <div class="page-head">
      <div>
        <h2 class="page-title">Docker 容器管理</h2>
        <p class="page-sub">管理系统中的容器：启动 / 停止 / 重启 / 更新 / 删除，并查看实时日志。</p>
      </div>
      <el-button type="primary" :icon="Refresh" @click="load" :loading="loading">刷新列表</el-button>
    </div>

    <el-alert
      v-if="dockerStatus !== 'running'"
      type="warning"
      :closable="false"
      show-icon
      title="Docker 服务未运行"
      description="当前无法获取容器列表，请确认宿主机上的 Docker 守护进程已启动。"
      style="margin-bottom: 16px"
    />

    <el-card class="table-card" shadow="never">
      <el-table :data="containers" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="容器ID" min-width="140">
          <template #default="{ row }">
            <span class="mono">{{ (row.id || '').slice(0, 12) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="容器名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.name }}</template>
        </el-table-column>
        <el-table-column label="镜像名称" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">{{ row.image }}</template>
        </el-table-column>
        <el-table-column label="运行状态" min-width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.state)" size="small" effect="dark">
              {{ row.state }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="320" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="success"
              :disabled="row.state === 'running'"
              @click="doAction('start', row)"
            >启动</el-button>
            <el-button
              size="small"
              type="warning"
              :disabled="row.state !== 'running'"
              @click="doAction('stop', row)"
            >停止</el-button>
            <el-button
              size="small"
              type="primary"
              :disabled="row.state !== 'running'"
              @click="doAction('restart', row)"
            >重启</el-button>
            <el-button size="small" @click="openUpdate(row)">更新</el-button>
            <el-button size="small" @click="openLogs(row)">日志</el-button>
            <el-popconfirm title="确认删除该容器？" @confirm="doAction('remove', row)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && dockerStatus === 'running' && containers.length === 0"
        description="暂无运行中的 Docker 容器"
      />
    </el-card>

    <!-- 日志对话框 -->
    <el-dialog v-model="logsVisible" :title="`容器日志 · ${currentName}`" width="760px">
      <pre class="logs-box">{{ logsText || '（暂无日志）' }}</pre>
    </el-dialog>

    <!-- 更新对话框 -->
    <el-dialog v-model="updateVisible" :title="`更新容器 · ${currentName}`" width="480px">
      <el-form label-width="80px">
        <el-form-item label="镜像 Tag">
          <el-input v-model="updateTag" placeholder="例如 latest 或指定版本" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="updateVisible = false">取消</el-button>
        <el-button type="primary" :loading="updating" @click="submitUpdate">确认更新</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  getDockerStatus, startContainer, stopContainer,
  restartContainer, deleteContainer, updateContainer, getContainerLogs
} from '../services'

const loading = ref(false)
const dockerStatus = ref('')
const containers = ref([])

const logsVisible = ref(false)
const logsText = ref('')
const currentName = ref('')
const currentId = ref('')

const updateVisible = ref(false)
const updateTag = ref('')
const updating = ref(false)

function normalize(list) {
  return (list || []).map(c => ({
    id: c.Id || c.id,
    name: (Array.isArray(c.Names) ? c.Names[0] : (c.Name || c.name || '-')).replace(/^\//, ''),
    image: c.Image || c.image || '-',
    state: c.State || c.state || c.status || '未知'
  }))
}

function statusType(state) {
  if (state === 'running') return 'success'
  if (state === 'paused') return 'warning'
  if (state === 'exited' || state === 'dead') return 'danger'
  return 'info'
}

async function load() {
  loading.value = true
  try {
    // 后端 /api/docker/status 返回的是数组（每容器一项；Docker 不可用时返回 [{ error: 'DOCKER_UNAVAILABLE', state: 'error', ... }]）
    const data = await getDockerStatus()
    const arr = Array.isArray(data) ? data : []
    const hasContainers = arr.length > 0
    const firstHasError = !!(arr[0] && arr[0].error)
    dockerStatus.value = hasContainers && !firstHasError ? 'running' : 'stopped'
    containers.value = normalize(arr.filter(c => !c.error))
  } catch (e) {
    dockerStatus.value = 'stopped'
    containers.value = []
    ElMessage.error('加载容器列表失败：' + (e.response?.data?.error || e.message))
  } finally {
    loading.value = false
  }
}

async function doAction(action, row) {
  const map = {
    start: () => startContainer(row.id),
    stop: () => stopContainer(row.id),
    restart: () => restartContainer(row.id),
    remove: () => deleteContainer(row.id)
  }
  try {
    const res = await map[action]()
    ElMessage.success(res.message || '操作成功')
    await load()
  } catch (e) {
    ElMessage.error('操作失败：' + (e.response?.data?.error || e.message))
  }
}

function openLogs(row) {
  currentId.value = row.id
  currentName.value = row.name
  logsText.value = ''
  logsVisible.value = true
  getContainerLogs(row.id)
    .then(t => { logsText.value = t })
    .catch(e => { logsText.value = '获取日志失败：' + (e.response?.data?.error || e.message) })
}

function openUpdate(row) {
  currentId.value = row.id
  currentName.value = row.name
  updateTag.value = ''
  updateVisible.value = true
}

async function submitUpdate() {
  updating.value = true
  try {
    const res = await updateContainer(currentId.value, updateTag.value)
    ElMessage.success(res.message || '更新成功')
    updateVisible.value = false
    await load()
  } catch (e) {
    ElMessage.error('更新失败：' + (e.response?.data?.error || e.message))
  } finally {
    updating.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.page-title { color: var(--fg); font-size: 20px; margin: 0; }
.page-sub { color: var(--muted); font-size: 13px; margin: 4px 0 0; }
.table-card { background: var(--bg-card); border: 1px solid var(--border); }
.table-card :deep(.el-table),
.table-card :deep(.el-table__inner-wrapper),
.table-card :deep(.el-table__expanded-cell) { background: var(--bg-card); }
.table-card :deep(.el-table tr),
.table-card :deep(.el-table th),
.table-card :deep(.el-table td) { background: var(--bg-card); color: var(--fg); border-bottom-color: var(--border); }
.table-card :deep(.el-table th.el-table__cell) { background: var(--bg-card-2); color: var(--fg-2); font-weight: 600; }
.table-card :deep(.el-table__row:hover > td) { background: var(--bg-hover) !important; }
.table-card :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) { background: var(--bg-card-2); }
.mono { font-family: 'Fira Code', ui-monospace, monospace; color: var(--fg-2); }
.logs-box {
  background: var(--code-bg); color: var(--fg); padding: 14px;
  border-radius: 8px; max-height: 420px; overflow: auto;
  font-family: 'Fira Code', ui-monospace, monospace; font-size: 12px; white-space: pre-wrap;
  border: 1px solid var(--border);
}
</style>
