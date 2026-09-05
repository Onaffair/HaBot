<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>触发规则管理</span>
          <el-button type="primary" @click="openDialog()">添加规则</el-button>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        class="mb12"
        title="这些规则在 Bot 启动时从数据库动态注册为命令；配置资源目录需先在「目录管理」中登记对应资源段。"
      />

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="命令名" width="140" />
        <el-table-column label="匹配方式" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="matchTypeTag(row.matchType)">{{ matchTypeLabel(row.matchType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发关键词" min-width="160">
          <template #default="{ row }">
            <div class="kw-wrap">
              <el-tag v-for="(k, i) in (row.keywords || [])" :key="i" size="small" class="kw-tag">{{ k }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="resourceName" label="资源目录" width="130" />
        <el-table-column prop="fileFilter" label="文件名过滤" min-width="120">
          <template #default="{ row }">{{ row.fileFilter || '—' }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80" align="center" />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="(val: boolean | string | number) => handleToggle(row, val as boolean)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该规则吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑触发规则' : '添加触发规则'" width="560px" top="8vh">
      <el-form :model="form" label-width="100px">
        <el-form-item label="命令名" required>
          <el-input v-model="form.name" placeholder="例如：哈个气" />
        </el-form-item>
        <el-form-item label="匹配方式">
          <el-radio-group v-model="form.matchType">
            <el-radio-button value="exact">完全相等</el-radio-button>
            <el-radio-button value="contains">包含子串</el-radio-button>
            <el-radio-button value="chars">包含全部字符</el-radio-button>
          </el-radio-group>
          <div class="path-hint">
            完全相等=消息等于关键词；包含子串=消息含关键词；包含全部字符=关键词每个字都出现（如"来首歌"）
          </div>
        </el-form-item>
        <el-form-item label="触发关键词">
          <div class="kw-editor">
            <el-tag v-for="(kw, i) in form.keywords" :key="i" closable class="kw-tag" @close="removeKeyword(i)">
              {{ kw }}
            </el-tag>
            <el-input
              v-model="keywordInput"
              placeholder="输入后回车添加"
              size="small"
              class="kw-input"
              @keyup.enter="addKeyword"
            />
          </div>
        </el-form-item>
        <el-form-item label="资源目录" required>
          <el-select v-model="form.resourceName" filterable placeholder="选择要发送的资源目录(资源段)">
            <el-option
              v-for="r in resourceOptions"
              :key="r.name"
              :label="`${r.name}（${r.path}）`"
              :value="r.name"
            />
          </el-select>
          <div class="path-hint">发送随机资源前会从该目录的媒体文件中随机选一个</div>
        </el-form-item>
        <el-form-item label="文件名过滤">
          <el-input v-model="form.fileFilter" placeholder="可选：只发送文件名包含该文字的文件（如“你不是我兄弟”）" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="form.priority" :min="0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="规则说明（可选）" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { commandRuleApi, managedResourceApi, CommandRule, ManagedResource } from '../api'

const tableData = ref<CommandRule[]>([])
const resourceOptions = ref<ManagedResource[]>([])
const loading = ref(false)

const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref(0)
const form = ref({
  name: '',
  description: '',
  enabled: true,
  matchType: 'contains' as 'exact' | 'contains' | 'chars',
  keywords: [] as string[],
  resourceName: '',
  fileFilter: '',
  priority: 0,
})
const keywordInput = ref('')

const matchTypeLabel = (t: string) =>
  ({ exact: '完全相等', contains: '包含子串', chars: '包含全部字符' } as Record<string, string>)[t] || t
const matchTypeTag = (t: string) =>
  ({ exact: 'warning', contains: '', chars: 'success' } as Record<string, string>)[t] || 'info'

const fetchData = async () => {
  loading.value = true
  try {
    const res = await commandRuleApi.list()
    tableData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const fetchResources = async () => {
  const res = await managedResourceApi.list()
  resourceOptions.value = res.data || []
}

const openDialog = (row?: CommandRule) => {
  if (row) {
    isEdit.value = true
    editingId.value = row.id
    form.value = {
      name: row.name,
      description: row.description || '',
      enabled: row.enabled,
      matchType: row.matchType,
      keywords: [...(row.keywords || [])],
      resourceName: row.resourceName,
      fileFilter: row.fileFilter || '',
      priority: row.priority,
    }
  } else {
    isEdit.value = false
    editingId.value = 0
    form.value = {
      name: '',
      description: '',
      enabled: true,
      matchType: 'contains',
      keywords: [],
      resourceName: resourceOptions.value[0]?.name || '',
      fileFilter: '',
      priority: 0,
    }
  }
  dialogVisible.value = true
}

const addKeyword = () => {
  const k = keywordInput.value.trim()
  if (!k) return
  if (!form.value.keywords.includes(k)) form.value.keywords.push(k)
  keywordInput.value = ''
}
const removeKeyword = (i: number) => form.value.keywords.splice(i, 1)

const handleToggle = async (row: CommandRule, val: boolean) => {
  try {
    await commandRuleApi.toggle(row.id, val)
    row.enabled = val
    ElMessage.success(val ? '已启用' : '已禁用')
  } catch { /* 拦截器已提示 */ }
}

const handleSave = async () => {
  if (!form.value.name.trim()) return ElMessage.warning('命令名不能为空')
  if (!form.value.resourceName) return ElMessage.warning('请选择资源目录')
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      enabled: form.value.enabled,
      matchType: form.value.matchType,
      keywords: form.value.keywords,
      resourceName: form.value.resourceName,
      fileFilter: form.value.fileFilter.trim() || undefined,
      priority: form.value.priority,
    }
    if (isEdit.value) {
      await commandRuleApi.update(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await commandRuleApi.create(payload)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await commandRuleApi.delete(id)
  ElMessage.success('删除成功')
  fetchData()
}

onMounted(() => {
  fetchData()
  fetchResources()
})
</script>

<style scoped>
.page-container { max-width: 1400px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.mb12 { margin-bottom: 12px; }
.kw-wrap { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.kw-tag { margin-right: 4px; }
.kw-editor { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
.kw-input { width: 180px; }
.path-hint { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4; }
.el-select { width: 100%; }
</style>
