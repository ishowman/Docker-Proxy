<template>
  <div class="ring-stat">
    <div class="ring-wrap">
      <svg viewBox="0 0 120 120" class="ring">
        <defs>
          <linearGradient :id="gid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" :stop-color="accent" />
            <stop offset="100%" :stop-color="accent2" />
          </linearGradient>
        </defs>
        <circle class="ring-bg" cx="60" cy="60" :r="R" />
        <circle
          class="ring-fg"
          cx="60" cy="60" :r="R"
          :stroke="`url(#${gid})`"
          :stroke-dasharray="C"
          :stroke-dashoffset="offset"
        />
      </svg>
      <div class="ring-center">
        <div class="ring-val">{{ display }}<span class="ring-unit">{{ unitText }}</span></div>
      </div>
    </div>
    <div class="ring-meta">
      <div class="ring-label">
        <el-icon class="ring-ic"><component :is="icon" /></el-icon>
        <span>{{ label }}</span>
      </div>
      <div class="ring-sub">{{ sub }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },   // 0-100，用于环形进度
  centerValue: { type: Number, default: null }, // 环形中心显示的数字（如已用 GB）；缺省则与 value 一致
  label: { type: String, required: true },
  sub: { type: String, default: '' },
  unit: { type: String, default: '%' },  // 中心数字单位：'%' 或 'GB' 等
  accent: { type: String, default: '#3b82f6' },
  accent2: { type: String, default: '#6366f1' },
  icon: { type: [Object, Function], required: true }
})

// 单位文本：百分比直接贴合数字，其他单位（GB 等）前面留一个空格，如 "33.1 GB"
const unitText = computed(() => props.unit === '%' ? '%' : ' ' + props.unit)

const R = 52
const C = 2 * Math.PI * R
const gid = 'ring-' + Math.random().toString(36).slice(2, 9)

const pct = computed(() => Math.max(0, Math.min(100, props.value || 0)))
const offset = computed(() => C * (1 - pct.value / 100))

// 中心显示的目标值：优先用 centerValue（如已用 GB），否则回退到 value（百分比）
const displayTarget = computed(() => (props.centerValue != null && isFinite(props.centerValue)) ? props.centerValue : (props.value || 0))

// 数字 count-up 动画
const display = ref(0)
let raf = null
function tween(to) {
  cancelAnimationFrame(raf)
  const from = display.value
  const start = performance.now()
  const dur = 700
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur)
    const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
    display.value = +(from + (to - from) * eased).toFixed(1)
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
watch(displayTarget, (v) => tween(v))
onMounted(() => tween(displayTarget.value))

// 阈值配色提示
defineExpose({ pct })
</script>

<style scoped>
.ring-stat { display: flex; align-items: center; gap: 16px; }
.ring-wrap { position: relative; width: 96px; height: 96px; flex: 0 0 auto; }
.ring { width: 96px; height: 96px; transform: rotate(-90deg); }
/* 极细极淡的导轨环：宽度减半 + 透明度低，仅作"未到达部分"的视觉提示，
   避免和前景环边缘齐平形成"重影/光晕" */
.ring-bg { fill: none; stroke: rgba(120, 120, 140, 0.18); stroke-width: 4; }
.ring-fg {
  fill: none; stroke-width: 10; stroke-linecap: round;
  transition: stroke-dashoffset .8s cubic-bezier(.22,1,.36,1);
}
.ring-center {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
}
.ring-val {
  font-size: 22px; font-weight: 700; color: var(--fg);
  font-variant-numeric: tabular-nums; letter-spacing: .5px;
}
.ring-unit { font-size: 12px; font-weight: 600; color: var(--muted); margin-left: 1px; }
.ring-meta { min-width: 0; }
.ring-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600; color: var(--fg-2);
}
.ring-ic { color: var(--accent); }
.ring-sub {
  margin-top: 4px; font-size: 12px; color: var(--muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
</style>
