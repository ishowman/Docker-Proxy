<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>网络测试</h2>
        <p class="muted">对目标域名执行 Ping 或 Traceroute 诊断</p>
      </div>
    </div>

    <el-card shadow="never" class="controls">
      <el-form label-width="90px">
        <el-form-item label="目标域名">
          <el-select v-model="domain" filterable allow-create default-first-option placeholder="选择或输入域名" style="width:100%">
            <el-option v-for="d in presets" :key="d" :label="d" :value="d" />
            <el-option label="自定义域名" value="__custom__" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="domain === '__custom__'" label="自定义">
          <el-input v-model="customDomain" placeholder="例如 example.com" />
        </el-form-item>
        <el-form-item label="测试类型">
          <el-radio-group v-model="testType">
            <el-radio value="ping">Ping (ICMP)</el-radio>
            <el-radio value="traceroute">Traceroute</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="running" @click="run"><el-icon><Promotion /></el-icon> 开始测试</el-button>
          <el-button @click="clear">清空结果</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="result">
      <pre v-if="output">{{ output }}</pre>
      <p v-else class="muted center">请选择参数并开始测试。</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import { networkTest } from '../services'

const presets = [
  'gcr.io', 'ghcr.io', 'quay.io', 'k8s.gcr.io', 'registry.k8s.io',
  'mcr.microsoft.com', 'docker.elastic.co', 'registry-1.docker.io', 'google.com', 'cloudflare.com'
]
const domain = ref('')
const customDomain = ref('')
const testType = ref('ping')
const running = ref(false)
const output = ref('')

async function run() {
  const target = domain.value === '__custom__' ? customDomain.value.trim() : domain.value
  if (!target) { ElMessage.warning('请选择或输入目标域名'); return }
  running.value = true
  output.value = '正在测试...'
  try {
    const res = await networkTest(target, testType.value)
    output.value = typeof res === 'string' ? res : JSON.stringify(res, null, 2)
  } catch (e) {
    output.value = '测试失败：' + (e.response?.data?.error || e.message || e)
  } finally { running.value = false }
}
function clear() { output.value = '' }
</script>

<style scoped>
.page { color: var(--fg); }
.page-head { margin-bottom: 16px; }
.page-head h2 { margin: 0 0 4px; }
.muted { color: var(--muted); margin: 0; font-size: 13px; }
.controls { margin-bottom: 16px; }
.result { min-height: 200px; }
.result pre { margin: 0; white-space: pre-wrap; font-size: 13px; color: var(--fg); }
.center { text-align: center; padding: 60px 0; }
:deep(.el-card) { background: var(--bg-card); border-color: var(--border); }
</style>
