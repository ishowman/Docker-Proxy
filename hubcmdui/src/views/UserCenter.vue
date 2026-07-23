<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>用户中心</h2>
        <p class="muted">查看账户信息、修改密码与用户名</p>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :span="10">
        <el-card shadow="never" class="profile">
          <div class="avatar"><el-icon><User /></el-icon></div>
          <h3>{{ info.username || '-' }}</h3>
          <p class="role">{{ info.role || 'admin' }}</p>
          <ul class="stats">
            <li><span>登录次数</span><b>{{ info.loginCount ?? '-' }}</b></li>
            <li><span>上次登录</span><b>{{ info.lastLogin || '未知' }}</b></li>
            <li><span>创建时长</span><b>{{ info.accountAge || '未知' }}</b></li>
            <li><span>注册时间</span><b>{{ info.createdAt || '未知' }}</b></li>
          </ul>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card shadow="never">
          <template #header><span>修改密码</span></template>
          <el-form label-width="100px" :model="pw">
            <el-form-item label="当前密码"><el-input v-model="pw.currentPassword" type="password" show-password /></el-form-item>
            <el-form-item label="新密码"><el-input v-model="pw.newPassword" type="password" show-password placeholder="8-16位，含字母、数字、特殊字符" /></el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="pwSaving" @click="onChangePw"><el-icon><Key /></el-icon> 更新密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" class="uname">
          <template #header><span>修改用户名</span></template>
          <el-form label-width="100px" :model="un">
            <el-form-item label="新用户名"><el-input v-model="un.newUsername" placeholder="3-20位，字母数字下划线" /></el-form-item>
            <el-form-item label="密码确认"><el-input v-model="un.password" type="password" show-password /></el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="unSaving" @click="onChangeUn"><el-icon><Edit /></el-icon> 更新用户名</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Key, Edit } from '@element-plus/icons-vue'
import { getUserInfo, changePassword, changeUsername } from '../services'

const info = ref({})
const pw = ref({ currentPassword: '', newPassword: '' })
const un = ref({ newUsername: '', password: '' })
const pwSaving = ref(false), unSaving = ref(false)

async function load() {
  try { info.value = await getUserInfo() } catch (e) { ElMessage.warning('读取用户信息失败：' + (e.response?.data?.error || e.message)) }
}
async function onChangePw() {
  if (!pw.value.currentPassword || !pw.value.newPassword) { ElMessage.warning('请填写完整'); return }
  pwSaving.value = true
  try { await changePassword(pw.value.currentPassword, pw.value.newPassword); ElMessage.success('密码已更新'); pw.value = { currentPassword: '', newPassword: '' } }
  catch (e) { ElMessage.error(e.response?.data?.error || e.message) }
  finally { pwSaving.value = false }
}
async function onChangeUn() {
  if (!un.value.newUsername || !un.value.password) { ElMessage.warning('请填写完整'); return }
  unSaving.value = true
  try {
    const r = await changeUsername(un.value.newUsername, un.value.password)
    ElMessage.success('用户名已更新为 ' + (r.newUsername || un.value.newUsername))
    un.value = { newUsername: '', password: '' }; load()
  }
  catch (e) { ElMessage.error(e.response?.data?.error || e.message) }
  finally { unSaving.value = false }
}
onMounted(load)
</script>

<style scoped>
.page { color: var(--fg); }
.page-head { margin-bottom: 16px; }
.page-head h2 { margin: 0 0 4px; }
.muted { color: var(--muted); margin: 0; font-size: 13px; }
.profile { text-align: center; }
.avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 30px; }
.profile h3 { margin: 0; }
.role { color: var(--muted); margin: 4px 0 16px; text-transform: capitalize; }
.stats { list-style: none; padding: 0; margin: 0; text-align: left; }
.stats li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.stats span { color: var(--muted); }
.uname { margin-top: 16px; }
:deep(.el-card) { background: var(--bg-card); border-color: var(--border); }
</style>
