<template>
  <el-card class="stat" shadow="never">
    <div class="stat-icon" :style="{ background: accent + '22', color: accent }">
      <el-icon :size="22"><component :is="icon" /></el-icon>
    </div>
    <div class="stat-body">
      <div class="stat-title">{{ title }}</div>
      <div class="stat-value" :style="{ color: accent }">{{ value }}</div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], default: '-' },
  icon: { type: [Object, Function], required: true },
  accent: { type: String, default: '#3b82f6' }
})
</script>
