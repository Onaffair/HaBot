<template>
  <div class="page-container">
    <!-- 默认管理目录 -->
    <el-card class="default-dir-card">
      <div class="default-dir-bar">
        <div class="default-dir-info">
          <el-icon color="#409EFF"><FolderOpened /></el-icon>
          <span class="label">默认管理目录：</span>
          <el-tooltip :content="defaultDir || '未设置'" placement="top">
            <span class="dir-path">{{ defaultDir || '未设置' }}</span>
          </el-tooltip>
        </div>
        <div>
          <el-button type="primary" plain @click="openDirDialog()">
            <el-icon><Folder /></el-icon>&nbsp;选择默认管理目录
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 资源段列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>资源段管理</span>
          <el-button type="primary" @click="openDialog()">添加资源段</el-button>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="资源名称" width="140" />
        <el-table-column prop="path" label="目录路径" show-overflow-tooltip min-width="220" />
        <el-table-column label="触发关键词" min-width="240">
          <template #default="{ row }">
            <div class="kw-wrap">
              <el-tag
                v-for="(k, i) in (row.keywords || []).slice(0, 6)"
                :key="i"
                size="small"
                class="kw-tag"
              >{{ k }}</el-tag>
              <el-tag v-if="(row.keywords || []).length > 6" size="small" type="info">
                +{{ row.keywords.length - 6 }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip min-width="140">
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column label="启用" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="(val: boolean | string | number) => handleToggle(row, val as boolean)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="setAsDefault(row)">设为默认</el-button>
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该资源段吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 资源段 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑资源段' : '添加资源段'"
      width="640px"
      top="6vh"
    >
      <el-form :model="form" label-width="110px">
        <el-form-item label="资源名称" required>
          <el-input v-model="form.name" placeholder="例如：原神" />
        </el-form-item>
        <el-form-item label="目录路径" required>
          <div class="path-picker">
            <el-input v-model="form.path" placeholder="粘贴完整路径，或点击右侧浏览选择">
              <template #append>
                <el-button :icon="FolderOpened" @click="openPathPicker()">浏览目录</el-button>
              </template>
            </el-input>
          </div>
          <div v-if="form.path" class="path-hint" :class="pathState === true ? 'ok' : pathState === false ? 'err' : ''">
            <template v-if="pathState === true">✓ 该目录在服务器上存在</template>
            <template v-else-if="pathState === false">✗ 该目录在服务器上不存在（保存时会由后端校验）</template>
            <template v-else>正在校验目录是否有效…</template>
          </div>
        </el-form-item>
        <el-form-item label="触发关键词">
          <div class="kw-editor">
            <el-tag
              v-for="(kw, i) in form.keywords"
              :key="i"
              closable
              class="kw-tag"
              @close="removeKeyword(i)"
            >{{ kw }}</el-tag>
            <el-input
              v-model="keywordInput"
              placeholder="输入后回车添加"
              size="small"
              class="kw-input"
              @keyup.enter="addKeyword"
            />
          </div>
          <div class="path-hint">可配置多个触发词，用回车键逐个添加</div>
        </el-form-item>
        <el-form-item label="资源描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="该资源的说明（可选）" />
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

    <!-- 目录选择对话框（默认目录 / 资源路径 共用） -->
    <el-dialog v-model="dirDialogVisible" :title="dirDialogTitle" width="520px" top="8vh">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="dir-alert"
        title="从下方目录树中选择一个文件夹；选中后点击确认写入路径。"
      />
      <el-tree
        ref="treeRef"
        :props="treeProps"
        :load="loadTreeNode"
        :data="treeData"
        lazy
        node-key="key"
        highlight-current
        class="dir-tree"
        @node-click="onTreeNodeClick"
      />
      <div class="selected-path">
        已选择：<span>{{ dirDialogResult }}</span>
      </div>
      <template #footer>
        <el-button @click="dirDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDir">确认选择</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FolderOpened, Folder } from '@element-plus/icons-vue'
import {
  managedResourceApi,
  resourceSettingApi,
  fileSystemApi,
  ManagedResource,
  FsNode
} from '../api'
import type { ElTree } from 'element-plus'

const tableData = ref<ManagedResource[]>([])
const loading = ref(false)
const defaultDir = ref<string | null>(null)

// 资源段表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref(0)
const form = ref({
  name: '',
  path: '',
  keywords: [] as string[],
  description: '',
  enabled: true,
})
const keywordInput = ref('')

// 目录树选择
const dirDialogVisible = ref(false)
const dirDialogTitle = ref('选择目录')
const dirDialogResult = ref('')
const dirDialogTarget = ref('default') // 记录最终要赋值的字段: default | path
const treeRef = ref<InstanceType<typeof ElTree>>()
const treeData = ref<FsNode[]>([])
const treeProps = {
  label: 'label',
  children: 'children',
  isLeaf: (node: FsNode) => !!node.leaf,
}

const loadTreeNode = async (node: any, resolve: (nodes: FsNode[]) => void) => {
  if (node.level === 0) {
    const res = await fileSystemApi.roots()
    resolve(res.data || [])
    return
  }
  const dirs = await fileSystemApi.dirs(node.data.path)
  // 子目录均非叶子（可继续下钻）；无子目录则标记为叶子
  const list = dirs.data || []
  resolve(list.map((d) => ({ ...d, leaf: list.length === 0 })))
}

const onTreeNodeClick = (data: FsNode) => {
  dirDialogResult.value = data.path
}

// ===== 数据加载 =====
const fetchData = async () => {
  loading.value = true
  try {
    const res = await managedResourceApi.list()
    tableData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const fetchDefaultDir = async () => {
  const res = await resourceSettingApi.getDefaultDir()
  defaultDir.value = res.data || null
}

// ===== 默认管理目录 =====
const openDirDialog = () => {
  dirDialogTitle.value = '选择默认管理目录'
  dirDialogResult.value = defaultDir.value || ''
  dirDialogVisible.value = true
  dirDialogTarget.value = 'default'
  loadInitialTree()
}

// 从某一资源段的目录设为默认
const setAsDefault = async (row: ManagedResource) => {
  try {
    await ElMessageBox.confirm(`将「${row.path}」设为默认管理目录？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await resourceSettingApi.setDefaultDir(row.path)
  ElMessage.success('已设为默认管理目录')
  fetchDefaultDir()
}

// ===== 目录树初始化 =====
const loadInitialTree = async () => {
  treeData.value = []
  // 若已配置默认目录则默认展开该节点，否则从 roots 开始
  const roots = await fileSystemApi.roots()
  treeData.value = roots.data || []
}

// ===== 目录选择回调 =====
const openPathPicker = () => {
  dirDialogTitle.value = '选择资源段目录'
  dirDialogResult.value = form.value.path || ''
  dirDialogVisible.value = true
  dirDialogTarget.value = 'path'
  loadInitialTree()
}

const confirmDir = () => {
  const val = dirDialogResult.value
  if (!val) {
    ElMessage.warning('请先选择一个目录')
    return
  }
  if (dirDialogTarget.value === 'default') {
    // 选择默认管理目录：立即写入
    void saveDefaultDir(val)
  } else {
    form.value.path = val
  }
  dirDialogVisible.value = false
}

const saveDefaultDir = async (val: string) => {
  await resourceSettingApi.setDefaultDir(val)
  ElMessage.success('默认管理目录已更新')
  defaultDir.value = val
}

// 目录路径有效性（null=校验中，true=存在，false=不存在）
const pathState = ref<boolean | null>(null)
let pathCheckTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => form.value.path,
  (val) => {
    if (pathCheckTimer) clearTimeout(pathCheckTimer)
    if (!val || !val.trim()) {
      pathState.value = null
      return
    }
    pathState.value = null
    pathCheckTimer = setTimeout(async () => {
      try {
        const res = await fileSystemApi.exists(val.trim())
        pathState.value = !!res.data
      } catch {
        pathState.value = null
      }
    }, 300)
  }
)

// ===== 资源段 CRUD =====
const openDialog = (row?: ManagedResource) => {
  if (row) {
    isEdit.value = true
    editingId.value = row.id
    form.value = {
      name: row.name,
      path: row.path,
      keywords: [...(row.keywords || [])],
      description: row.description || '',
      enabled: row.enabled,
    }
  } else {
    isEdit.value = false
    editingId.value = 0
    form.value = { name: '', path: '', keywords: [], description: '', enabled: true }
  }
  dialogVisible.value = true
}

const addKeyword = () => {
  const k = keywordInput.value.trim()
  if (!k) return
  if (!form.value.keywords.includes(k)) {
    form.value.keywords.push(k)
  }
  keywordInput.value = ''
}

const removeKeyword = (i: number) => {
  form.value.keywords.splice(i, 1)
}

const handleToggle = async (row: ManagedResource, val: boolean) => {
  try {
    await managedResourceApi.toggle(row.id, val)
    row.enabled = val
    ElMessage.success(val ? '已启用' : '已禁用')
  } catch {
    // 失败时回滚（由 API 层已弹错误）
  }
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('资源名称不能为空')
    return
  }
  if (!form.value.path.trim()) {
    ElMessage.warning('目录路径不能为空')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      path: form.value.path.trim(),
      keywords: form.value.keywords,
      description: form.value.description.trim() || undefined,
      enabled: form.value.enabled,
    }
    if (isEdit.value) {
      await managedResourceApi.update(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await managedResourceApi.create(payload)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await managedResourceApi.delete(id)
  ElMessage.success('删除成功')
  fetchData()
}

onMounted(() => {
  fetchData()
  fetchDefaultDir()
})
</script>

<style scoped>
.page-container { max-width: 1400px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.default-dir-card { margin-bottom: 16px; }
.default-dir-bar { display: flex; justify-content: space-between; align-items: center; }
.default-dir-info { display: flex; align-items: center; gap: 6px; }
.default-dir-info .label { color: #606266; }
.dir-path { font-weight: 600; color: #409EFF; word-break: break-all; }
.kw-wrap { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.kw-tag { margin-right: 4px; }
.kw-editor { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
.kw-input { width: 180px; }
.path-picker { width: 100%; }
.path-hint { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4; }
.path-hint.ok { color: #67c23a; }
.path-hint.err { color: #f56c6c; }
.dir-alert { margin-bottom: 8px; }
.dir-tree { max-height: 40vh; overflow: auto; border: 1px solid #e6e6e6; border-radius: 4px; padding: 8px; }
.selected-path { margin-top: 8px; font-size: 13px; color: #606266; word-break: break-all; }
.selected-path span { color: #409EFF; }
</style>
