<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>文档管理</h2>
        <p class="muted">创建、编辑与发布使用教程文档（支持 Markdown）</p>
      </div>
      <el-button type="primary" @click="onCreate"><el-icon><Plus /></el-icon> 新建文档</el-button>
    </div>

    <!-- KPI 概览 -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-ic stat-ic--blue"><el-icon><Document /></el-icon></div>
        <div class="stat-meta"><span class="stat-val">{{ docs.length }}</span><span class="stat-lbl">文档总数</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-ic stat-ic--green"><el-icon><Promotion /></el-icon></div>
        <div class="stat-meta"><span class="stat-val">{{ publishedCount }}</span><span class="stat-lbl">已发布</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-ic stat-ic--amber"><el-icon><EditPen /></el-icon></div>
        <div class="stat-meta"><span class="stat-val">{{ draftCount }}</span><span class="stat-lbl">草稿</span></div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input v-model="search" class="toolbar__search" placeholder="按标题搜索文档" clearable>
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <span class="toolbar__spacer" />
      <span class="toolbar__count">共 <b>{{ filteredDocs.length }}</b> 篇文档</span>
      <el-button :icon="Refresh" circle plain title="刷新" @click="load" />
    </div>

    <div class="table-card" v-loading="loading">
      <el-table v-if="filteredDocs.length" :data="filteredDocs" class="admin-table" stripe style="width:100%">
        <el-table-column prop="title" label="标题" min-width="240">
          <template #default="{ row }">
            <div class="cell-primary">
              <span class="cell-av"><el-icon><Document /></el-icon></span>
              <span class="cell-title">{{ row.title || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <span class="badge" :class="row.published ? 'badge--success' : 'badge--muted'">
              {{ row.published ? '已发布' : '草稿' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="190">
          <template #default="{ row }">
            <span class="cell-sub">{{ fmtTime(row.updatedAt || row.updated_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button
                size="small"
                text
                :type="row.published ? 'warning' : 'success'"
                @click="onTogglePublish(row)"
              >
                {{ row.published ? '下架' : '发布' }}
              </el-button>
              <el-button circle size="small" type="primary" plain @click="onEdit(row)" title="编辑">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button circle size="small" type="danger" plain @click="onDelete(row)" title="删除">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="empty-state">
        <div class="empty-ic"><el-icon><Document /></el-icon></div>
        <div class="empty-title">{{ search ? '没有匹配的文档' : '还没有任何文档' }}</div>
        <p class="empty-desc">
          {{ search ? `没有与“${search}”匹配的文档，换个关键词试试。` : '点击右上角「新建文档」，开始编写第一篇使用教程。' }}
        </p>
        <div class="empty-actions">
          <el-button v-if="search" @click="search = ''">清除搜索</el-button>
          <el-button v-else type="primary" @click="onCreate"><el-icon><Plus /></el-icon> 新建文档</el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑文档' : '新建文档'"
      width="92%"
      top="4vh"
      :close-on-click-modal="false"
      class="doc-dialog"
    >
      <el-form label-width="80px" class="doc-form">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入文档标题" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="正文">
          <div class="md-wrap">
            <MdEditor
              v-model="form.content"
              :theme="editorTheme"
              :preview="previewMode"
              :toolbars="toolbars"
              :show-code-row-number="true"
              language="zh-CN"
              style="height: 56vh; width: 100%"
              @on-change="onMdChange"
            />
          </div>
        </el-form-item>
        <el-form-item label="发布">
          <el-switch v-model="form.published" active-text="发布到前台" inactive-text="保存为草稿" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dlg-foot">
          <span class="muted small">字数：{{ wordCount }} · 预览：{{ previewMode === 'preview' ? '双栏' : previewMode === 'edit' ? '仅编辑' : '仅预览' }}</span>
          <div>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Document, Promotion, EditPen, Search, Refresh } from '@element-plus/icons-vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { listDocuments, getDocument, createDocument, saveDocument, deleteDocument, togglePublish } from '../services'
import { useTheme } from '../composables/useTheme'

const docs = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editing = ref(false)
const saving = ref(false)
const form = ref({ id: null, title: '', content: '', published: false })
const wordCount = ref(0)
const previewMode = ref('preview') // 'preview' | 'edit' | false
const search = ref('')

const publishedCount = computed(() => docs.value.filter(d => d.published).length)
const draftCount = computed(() => docs.value.filter(d => !d.published).length)
const filteredDocs = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return docs.value
  return docs.value.filter(d => (d.title || '').toLowerCase().includes(kw))
})
const { mode } = useTheme()
const editorTheme = computed(() => (mode.value === 'light' || (mode.value === 'auto' && !document.documentElement.classList.contains('dark'))) ? 'light' : 'dark')

// 常用工具栏（精简版）
const toolbars = [
  'bold', 'underline', 'italic', 'strikeThrough',
  '-',
  'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList',
  '-',
  'code', 'link', 'image', 'table', 'codeRow',
  '-',
  'preview', 'fullscreen'
]

async function load() {
  loading.value = true
  try { docs.value = await listDocuments() } catch (e) { ElMessage.error('加载失败：' + (e.response?.data?.error || e.message)) }
  finally { loading.value = false }
}
function onCreate() {
  editing.value = false
  form.value = { id: null, title: '', content: '# 新文档\n\n开始编写您的使用文档...', published: false }
  wordCount.value = form.value.content.length
  dialogVisible.value = true
}
// 列表接口只返摘要（不返 content 大字段），编辑时按 id 单独拉一次全文
async function onEdit(row) {
  editing.value = true
  saving.value = true
  dialogVisible.value = true
  // 先用列表里的标题占位，避免空白闪烁
  form.value = { id: row.id, title: row.title, content: row.content || '', published: !!row.published }
  wordCount.value = (row.content || '').length
  try {
    const detail = await getDocument(row.id)
    if (detail) {
      form.value = { id: detail.id, title: detail.title, content: detail.content || '', published: !!detail.published }
      wordCount.value = (detail.content || '').length
    }
  } catch (e) {
    ElMessage.error('加载文档失败：' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}
function onMdChange(value) {
  wordCount.value = (value || '').length
}
async function onSave() {
  if (!form.value.title || !form.value.content) { ElMessage.warning('标题和内容为必填项'); return }
  saving.value = true
  try {
    if (editing.value) await saveDocument(form.value.id, { title: form.value.title, content: form.value.content, published: form.value.published })
    else await createDocument({ title: form.value.title, content: form.value.content, published: form.value.published })
    ElMessage.success('已保存')
    dialogVisible.value = false
    load()
  } catch (e) { ElMessage.error('保存失败：' + (e.response?.data?.error || e.message)) }
  finally { saving.value = false }
}
async function onTogglePublish(row) {
  try { await togglePublish(row.id); ElMessage.success('已切换'); load() }
  catch (e) { ElMessage.error(e.response?.data?.error || e.message) }
}
async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除文档「${row.title}」？`, '提示', { type: 'warning' })
    await deleteDocument(row.id); ElMessage.success('已删除'); load()
  } catch (e) { if (e !== 'cancel') ElMessage.error(e.response?.data?.error || e.message) }
}
function fmtTime(t) { if (!t) return '-'; try { return new Date(t).toLocaleString('zh-CN') } catch { return String(t) } }
onMounted(load)
</script>

<style scoped>
.page { color: var(--fg); }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-head h2 { margin: 0 0 4px; color: var(--fg); }
.muted { color: var(--muted); margin: 0; font-size: 13px; }
.muted.small { font-size: 12px; }
:deep(.el-card) { background: var(--bg-card); border-color: var(--border); }
:deep(.el-form-item__label) { color: var(--fg-2); }
:deep(.el-input__inner) { color: var(--fg); }

.doc-form :deep(.el-dialog__body) { padding: 16px 20px; }
.md-wrap { width: 100%; }
.dlg-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; }

/* 适配浅色：编辑器外层 */
:deep(.doc-dialog .el-dialog) { background: var(--bg-card); }
:deep(.doc-dialog .el-dialog__title) { color: var(--fg); }

/* 让 md-editor 高度自适应 */
:deep(.md-editor) { border-radius: 8px; }
</style>
