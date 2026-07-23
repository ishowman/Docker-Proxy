<template>
  <div class="page nt-page">
    <div class="page-head nt-head">
      <div class="head-badge">
        <el-icon><Connection /></el-icon>
      </div>
      <div class="head-text">
        <h2>网络诊断</h2>
        <p class="muted">Ping · Traceroute · HTTP · DNS · TCP 与下载测速，一站式网络连通性检测</p>
      </div>
    </div>

    <el-card shadow="never" class="panel-card">
      <el-tabs v-model="activeTab" class="nt-tabs">
        <!-- Ping -->
        <el-tab-pane name="ping">
          <template #label><span class="tab-label"><el-icon><Aim /></el-icon> Ping</span></template>
          <div class="nt-form console-bar">
            <el-input v-model="forms.ping.target" placeholder="例如 google.com 或 8.8.8.8" clearable class="grow" @keyup.enter="run('ping')">
              <template #prefix><el-icon><Position /></el-icon></template>
            </el-input>
            <el-button type="primary" :loading="running.ping" @click="run('ping')">
              <el-icon><Promotion /></el-icon> 开始测试
            </el-button>
          </div>
          <PingResult v-if="results.ping" :data="results.ping" />
          <div v-else class="empty-hint"><el-icon><DataLine /></el-icon><span>输入目标后点击「开始测试」查看实时延迟走势</span></div>
        </el-tab-pane>

        <!-- Traceroute -->
        <el-tab-pane name="traceroute">
          <template #label><span class="tab-label"><el-icon><Share /></el-icon> Traceroute</span></template>
          <div class="nt-form console-bar">
            <el-input v-model="forms.traceroute.target" placeholder="例如 ghcr.io" clearable class="grow" @keyup.enter="run('traceroute')">
              <template #prefix><el-icon><Position /></el-icon></template>
            </el-input>
            <el-button type="primary" :loading="running.traceroute" @click="run('traceroute')">
              <el-icon><Promotion /></el-icon> 开始测试
            </el-button>
          </div>
          <TracerouteResult v-if="results.traceroute" :data="results.traceroute" />
          <div v-else class="empty-hint"><el-icon><Share /></el-icon><span>追踪数据包从本机到目标所经过的每一跳节点</span></div>
        </el-tab-pane>

        <!-- HTTP -->
        <el-tab-pane name="http">
          <template #label><span class="tab-label"><el-icon><Link /></el-icon> HTTP</span></template>
          <div class="nt-form console-bar">
            <el-input v-model="forms.http.target" placeholder="例如 https://docker.io 或 docker.io" clearable class="grow" @keyup.enter="run('http')">
              <template #prefix><el-icon><Link /></el-icon></template>
            </el-input>
            <el-button type="primary" :loading="running.http" @click="run('http')">
              <el-icon><Promotion /></el-icon> 开始测试
            </el-button>
          </div>
          <HttpResult v-if="results.http" :data="results.http" />
          <div v-else class="empty-hint"><el-icon><Link /></el-icon><span>检测目标站点的可达性与响应耗时</span></div>
        </el-tab-pane>

        <!-- DNS -->
        <el-tab-pane name="dns">
          <template #label><span class="tab-label"><el-icon><Coordinate /></el-icon> DNS</span></template>
          <div class="nt-form console-bar">
            <el-input v-model="forms.dns.target" placeholder="例如 registry-1.docker.io" clearable class="grow" @keyup.enter="run('dns')">
              <template #prefix><el-icon><Position /></el-icon></template>
            </el-input>
            <el-button type="primary" :loading="running.dns" @click="run('dns')">
              <el-icon><Promotion /></el-icon> 开始解析
            </el-button>
          </div>
          <DnsResult v-if="results.dns" :data="results.dns" />
          <div v-else class="empty-hint"><el-icon><Coordinate /></el-icon><span>查询域名解析到的 IP 记录</span></div>
        </el-tab-pane>

        <!-- TCP -->
        <el-tab-pane name="tcp">
          <template #label><span class="tab-label"><el-icon><Switch /></el-icon> TCP</span></template>
          <div class="nt-form console-bar">
            <el-input v-model="forms.tcp.target" placeholder="例如 ghcr.io" clearable class="grow" @keyup.enter="run('tcp')">
              <template #prefix><el-icon><Position /></el-icon></template>
            </el-input>
            <el-input-number v-model="forms.tcp.port" :min="1" :max="65535" controls-position="right" placeholder="端口" class="port" />
            <el-button type="primary" :loading="running.tcp" @click="run('tcp')">
              <el-icon><Promotion /></el-icon> 测试连通
            </el-button>
          </div>
          <TcpResult v-if="results.tcp" :data="results.tcp" />
          <div v-else class="empty-hint"><el-icon><Switch /></el-icon><span>检测指定主机与端口的 TCP 连通性</span></div>
        </el-tab-pane>

        <!-- Speed -->
        <el-tab-pane name="speed">
          <template #label><span class="tab-label"><el-icon><Odometer /></el-icon> 测速</span></template>
          <div class="nt-form console-bar">
            <el-select v-model="forms.speed.url" class="grow" filterable allow-create default-first-option placeholder="选择或输入测速节点 URL">
              <el-option v-for="u in speedPresets" :key="u.value" :label="u.label" :value="u.value" />
            </el-select>
            <el-button type="primary" :loading="running.speed" @click="run('speed')">
              <el-icon><Promotion /></el-icon> 开始测速
            </el-button>
          </div>
          <SpeedResult v-if="results.speed" :data="results.speed" />
          <div v-else class="empty-hint"><el-icon><Odometer /></el-icon><span>从公共节点下载样本文件估算下行带宽</span></div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Promotion, Position, Link, Connection, Aim, Share, Coordinate, Switch, Odometer, DataLine
} from '@element-plus/icons-vue'
import { networkTest } from '../services'
import PingResult from '../components/network/PingResult.vue'
import TracerouteResult from '../components/network/TracerouteResult.vue'
import HttpResult from '../components/network/HttpResult.vue'
import DnsResult from '../components/network/DnsResult.vue'
import TcpResult from '../components/network/TcpResult.vue'
import SpeedResult from '../components/network/SpeedResult.vue'

const activeTab = ref('ping')

const speedPresets = [
  { label: 'Cloudflare 10MB', value: 'https://speed.cloudflare.com/__down?bytes=10000000' },
  { label: 'Cloudflare 25MB', value: 'https://speed.cloudflare.com/__down?bytes=25000000' },
  { label: 'CacheFly 10MB', value: 'https://cachefly.cachefly.net/10mb.test' },
  { label: 'Speedtest 10MB', value: 'https://speedtest.tele2.net/10MB.zip' }
]

const forms = reactive({
  ping: { target: 'google.com' },
  traceroute: { target: 'ghcr.io' },
  http: { target: 'https://docker.io' },
  dns: { target: 'registry-1.docker.io' },
  tcp: { target: 'ghcr.io', port: 443 },
  speed: { url: speedPresets[0].value }
})

const running = reactive({
  ping: false, traceroute: false, http: false, dns: false, tcp: false, speed: false
})

const results = reactive({
  ping: null, traceroute: null, http: null, dns: null, tcp: null, speed: null
})

async function run(type) {
  const form = forms[type]
  const target = type === 'speed' ? form.url : (form.target || '').trim()
  if (!target) {
    ElMessage.warning(type === 'speed' ? '请选择测速节点' : '请输入目标地址')
    return
  }

  running[type] = true
  try {
    const payload = type === 'tcp'
      ? { type, target, port: form.port }
      : type === 'speed'
        ? { type, target, url: form.url }
        : { type, target }
    const res = await networkTest(payload)
    results[type] = res
  } catch (e) {
    const msg = e.response?.data?.error || e.response?.data?.details || e.message || '测试失败'
    ElMessage.error(msg)
  } finally {
    running[type] = false
  }
}
</script>

<style scoped>
.nt-page { color: var(--fg); }
.page-head.nt-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.head-badge {
  width: 46px; height: 46px; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 8px 20px var(--accent-soft);
  font-size: 22px;
}
.head-text h2 { margin: 0 0 3px; font-size: 20px; letter-spacing: -0.01em; }
.head-text .muted { color: var(--muted); margin: 0; font-size: 13px; }

.panel-card { background: var(--bg-card); border-color: var(--border); overflow: hidden; }
:deep(.el-card) { background: var(--bg-card); border-color: var(--border); }

/* 标签导航：胶囊分段控件 */
.nt-tabs :deep(.el-tabs__header) {
  border: none; margin: 0 0 18px;
  background: var(--bg-card-2);
  border-radius: 12px;
  padding: 5px;
}
.nt-tabs :deep(.el-tabs__nav) { border: none !important; display: flex; gap: 2px; }
.nt-tabs :deep(.el-tabs__item) {
  border: none !important;
  border-radius: 9px;
  height: 38px; line-height: 38px;
  color: var(--fg-2);
  font-weight: 600;
  transition: background .18s ease, color .18s ease;
}
.nt-tabs :deep(.el-tabs__item.is-active) {
  background: var(--bg-card);
  color: var(--accent);
  box-shadow: 0 2px 8px rgba(15, 23, 42, .08);
}
.nt-tabs :deep(.el-tabs__active-bar) { display: none; }
.nt-tabs :deep(.el-tabs__content) { padding-top: 2px; }

.tab-label { display: inline-flex; align-items: center; gap: 6px; }
.tab-label .el-icon { font-size: 15px; }

/* 控制台风格表单条 */
.nt-form.console-bar {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  background: var(--bg-card-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 18px;
}
.nt-form.console-bar .grow { flex: 1 1 280px; }
.nt-form.console-bar .port { width: 130px; flex: 0 0 auto; }

/* 空状态提示 */
.empty-hint {
  display: flex; align-items: center; gap: 10px;
  padding: 28px 18px;
  color: var(--muted);
  background: var(--bg-card-2);
  border: 1px dashed var(--border-strong);
  border-radius: 12px;
  font-size: 13px;
}
.empty-hint .el-icon { font-size: 18px; color: var(--accent); }

@media (prefers-reduced-motion: reduce) {
  .nt-tabs :deep(.el-tabs__item) { transition: none; }
}
</style>
