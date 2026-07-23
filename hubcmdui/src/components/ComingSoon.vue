<template>
  <el-card class="coming" shadow="never">
    <el-result
      icon="info"
      :title="title"
      sub-title="该模块正在迁移中，将以 Vue 3 + Element Plus 完整实现，功能与原有 jQuery 前端保持一致。"
    >
      <template #extra>
        <el-button type="primary" @click="$router.push({ name: 'dashboard' })">返回看板</el-button>
      </template>
    </el-result>
  </el-card>
</template>

<script setup>
defineProps({ title: { type: String, default: '模块' } })
</script>

<style scoped>
.coming { background: #0f172a; border: 1px solid #1e293b; }
.coming :deep(.el-result__title) { color: #e2e8f0; }
</style>
