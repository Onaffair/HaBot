<template>
  <div class="page-container">
    <!-- 默认管理目录 -->
    <a-card :bordered="false" class="mb-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <FolderOpenOutlined style="color: #1677ff" />
          <span class="text-gray-600">默认管理目录：</span>
          <a-tooltip :title="defaultDir || '未设置'">
            <span class="break-all font-semibold text-[#1677ff]">{{ defaultDir || '未设置' }}</span>
          </a-tooltip>
        </div>
        <a-button type="primary" ghost @click="openDirDialog()">
          <template #icon><FolderOutlined /></template>
          选择默认管理目录
        </a-button>
      </div>
    </a-card>

    <!-- 资源段列表 -->
    <a-card :bordered="false">
      <template #title>
        <div class="card-header">
          <span>资源段管理</span>
          <a-button type="primary" @click="openDialog()">添加资源段</a-button>
        </div>
      </template>

      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="id"
        bordered
        size="middle"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'keywords'">
            <div class="kw-wrap">
              <a-tag v-for="(k, i) in (record.keywords || []).slice(0, 6)" :key="i">{{ k }}</a-tag>
              <a-tag v-if="(record.keywords || []).length > 6" color="default">
                +{{ record.keywords.length - 6 }}
              </a-tag>
            </div>
          </template>
          <template v-else-if="column.key === 'description'">
            {{ record.description || '—' }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-switch
              :checked="record.enabled"
              @update:checked="(v: boolean) => handleToggle(record, v)"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" type="link" @click="setAsDefault(record)">设为默认</a-button>
              <a-button size="small" type="link" @click="openDialog(record)">编辑</a-button>
              <a-popconfirm
                title="确定删除该资源段吗？"
                ok-text="删除"
                cancel-text="取消"
                @confirm="handleDelete(record.id)"
              >
                <a-button size="small" type="link" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 资源段 添加/编辑对话框 -->
    <a-modal
      v-model:open="dialogVisible"
      :title="isEdit ? '编辑资源段' : '添加资源段'"
      :width="680"
      :confirm-loading="saving"
      @ok="handleSave"
    >
      <a-form :model="form" layout="vertical" class="pt-2">
        <a-form-item label="资源名称" required>
          <a-input v-model:value="form.name" placeholder="例如：原神" />
        </a-form-item>
        <a-form-item label="目录路径" required>
          <a-input v-model:value="form.path" placeholder="粘贴完整路径，或点击右侧浏览选择">
            <template #addonAfter>
              <a @click="openPathPicker">浏览目录</a>
            </template>
          </a-input>
          <div
            v-if="form.path"
            class="path-hint"
            :class="pathState === true ? 'ok' : pathState === false ? 'err' : ''"
          >
            <template v-if="pathState === true">✓ 该目录在服务器上存在</template>
            <template v-else-if="pathState === false">✗ 该目录在服务器上不存在（保存时会由后端校验）</template>
            <template v-else>正在校验目录是否有效…</template>
          </div>
        </a-form-item>
        <a-form-item label="触发关键词">
          <div class="kw-editor">
            <a-tag
              v-for="(kw, i) in form.keywords"
              :key="i"
              closable
              @close="removeKeyword(i)"
            >{{ kw }}</a-tag>
            <a-input
              v-model:value="keywordInput"
              placeholder="输入后回车添加"
              size="small"
              style="width: 180px"
              @keyup.enter="addKeyword"
            />
          </div>
          <div class="path-hint">可配置多个触发词，用回车键逐个添加</div>
        </a-form-item>
        <a-form-item label="资源描述">
          <a-textarea v-model:value="form.description" :rows="2" placeholder="该资源的说明（可选）" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch
            v-model:checked="form.enabled"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 目录选择对话框（默认目录 / 资源路径 共用） -->
    <a-modal
      v-model:open="dirDialogVisible"
      :title="dirDialogTitle"
      :width="560"
      @ok="confirmDir"
    >
      <a-alert
        class="mb-2"
        type="info"
        show-icon
        message="从下方目录树中选择一个文件夹；选中后点击确认写入路径。"
      />
      <a-tree
        v-if="dirDialogVisible"
        :tree-data="treeData as any"
        :load-data="loadTreeNode as any"
        v-model:selectedKeys="treeSelectedKeys"
        block-node
        class="max-h-[40vh] overflow-auto rounded border border-gray-200 p-2"
        @select="onTreeNodeSelect"
      />
      <div class="mt-2 break-all text-[13px] text-gray-600">
        已选择：<span class="text-[#1677ff]">{{ dirDialogResult || '（尚未选择，请先点击选择一个目录）' }}</span>
      </div>
      <div v-if="dirDialogResult" class="mt-2 flex flex-wrap items-center gap-2">
        <a-button size="small" @click="triggerUpload">
          <template #icon><UploadOutlined /></template>
          上传文件
        </a-button>
        <a-button size="small" @click="openMkdir">
          <template #icon><FolderAddOutlined /></template>
          新建目录
        </a-button>
        <span class="text-xs text-gray-400">上传/新建后 bot 会自动纳入对应资源，实时生效</span>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg,.amr"
        class="hidden"
        @change="onUploadChange"
      />
    </a-modal>

    <!-- 新建目录名输入对话框（替代 ElMessageBox.prompt） -->
    <a-modal
      v-model:open="mkdirVisible"
      title="新建目录"
      :confirm-loading="mkdirSaving"
      @ok="confirmMkdir"
    >
      <a-form layout="vertical" class="pt-2">
        <a-form-item :help="`将在以下目录下新建子目录：${dirDialogResult}`">
          <a-input v-model:value="mkdirName" placeholder="输入新目录名称" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  FolderOpenOutlined,
  FolderOutlined,
  FolderAddOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { FileSystemApi, ManagedResourceApi, ResourceSettingApi } from '@/api'
import type { FsNode, ManagedResource } from '@/api'

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
  { title: '资源名称', dataIndex: 'name', key: 'name', width: 140 },
  { title: '目录路径', dataIndex: 'path', key: 'path', width: 240, ellipsis: true },
  { title: '触发关键词', key: 'keywords', width: 260 },
  { title: '描述', key: 'description', width: 160, ellipsis: true },
  { title: '启用', key: 'enabled', width: 90, align: 'center' },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
]

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
const dirDialogTarget = ref<'default' | 'path'>('default')
const treeData = ref<any[]>([])
const treeSelectedKeys = ref<string[]>([])

/** 后端 FsNode -> antd Tree 需要的 { title,key,isLeaf,children } 结构 */
const toTreeNode = (n: FsNode) => ({
  title: n.label,
  key: n.key || n.path,
  path: n.path,
  isLeaf: !!n.leaf,
  selectable: true,
  children: undefined,
})

const loadTreeNode = async (node: any): Promise<void> => {
  // antd 懒加载：node 展开时请求其子目录
  const res = await FileSystemApi.dirs(node.path ?? node.data?.path)
  const list = res.data || []
  // 懒加载回调收到的是内部扁平化出的临时副本，直接改它的 children 不会落到
  // treeData 源节点上；dataRef 指向源数据对象，回写后再整体替换数组引用触发重渲染。
  const original = node.dataRef ?? findTreeNodeByKey(treeData.value, String(node.key ?? node.path))
  if (original) original.children = list.map(toTreeNode)
  treeData.value = [...treeData.value]
}

/** 在目录树数据中按 key 查找源节点（含子层），用于懒加载回写定位 */
const findTreeNodeByKey = (nodes: any[], key: string): any | null => {
  for (const n of nodes) {
    if (String(n.key) === key) return n
    if (n.children?.length) {
      const hit = findTreeNodeByKey(n.children, key)
      if (hit) return hit
    }
  }
  return null
}

const onTreeNodeSelect = (keys: (string | number)[], info: any) => {
  const node = info?.node
  if (node) {
    dirDialogResult.value = (node as any).path || String(keys[0] ?? '')
    treeSelectedKeys.value = [String(keys[0] ?? '')]
  }
}

// ===== 目录树操作：上传文件 / 新建目录 =====
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement>()

/** 触发隐藏文件选择框 */
const triggerUpload = () => {
  if (!dirDialogResult.value) return
  const input = fileInputRef.value
  if (input) {
    input.value = ''
    input.click()
  }
}

/** 选中文件后上传到当前选中目录 */
const onUploadChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files ? Array.from(target.files) : []
  if (!files.length || !dirDialogResult.value) return
  uploading.value = true
  try {
    const res = await FileSystemApi.upload(dirDialogResult.value, files)
    const names = (res.data?.files || []).map((p) => p.split(/[\\/]/).pop())
    message.success(`已上传 ${names.length} 个文件到 ${dirDialogResult.value}`)
    fetchData()
  } finally {
    uploading.value = false
  }
}

// 新建目录：使用独立 a-modal + a-input 替代 ElMessageBox.prompt
const mkdirVisible = ref(false)
const mkdirSaving = ref(false)
const mkdirName = ref('')

const openMkdir = () => {
  if (!dirDialogResult.value) return
  mkdirName.value = ''
  mkdirVisible.value = true
}

const confirmMkdir = async () => {
  const name = mkdirName.value.trim()
  if (!name) return message.warning('目录名不能为空')
  mkdirSaving.value = true
  try {
    await FileSystemApi.mkdir(dirDialogResult.value, name)
    message.success(`目录 ${name} 创建成功`)
    mkdirVisible.value = false
    await reloadDirTree()
    fetchData()
  } finally {
    mkdirSaving.value = false
  }
}

/** 重新加载目录树根节点 */
const reloadDirTree = async () => {
  treeData.value = []
  const roots = await FileSystemApi.roots()
  treeData.value = (roots.data || []).map(toTreeNode)
}

// ===== 数据加载 =====
const fetchData = async () => {
  loading.value = true
  try {
    const res = await ManagedResourceApi.list()
    tableData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const fetchDefaultDir = async () => {
  const res = await ResourceSettingApi.getDefaultDir()
  defaultDir.value = res.data || null
}

// ===== 默认管理目录 =====
const openDirDialog = () => {
  dirDialogTitle.value = '选择默认管理目录'
  dirDialogResult.value = defaultDir.value || ''
  dirDialogTarget.value = 'default'
  dirDialogVisible.value = true
  void loadInitialTree()
}

/** 将某一资源段的目录设为默认 */
const setAsDefault = (row: ManagedResource) => {
  Modal.confirm({
    title: '提示',
    content: `将「${row.path}」设为默认管理目录？`,
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      await ResourceSettingApi.setDefaultDir(row.path)
      message.success('已设为默认管理目录')
      fetchDefaultDir()
    },
  })
}

// ===== 目录树初始化 =====
const loadInitialTree = async () => {
  treeData.value = []
  const roots = await FileSystemApi.roots()
  treeData.value = (roots.data || []).map(toTreeNode)
}

// ===== 目录选择回调（资源段表单内）=====
const openPathPicker = () => {
  dirDialogTitle.value = '选择资源段目录'
  dirDialogResult.value = form.value.path || ''
  dirDialogTarget.value = 'path'
  dirDialogVisible.value = true
  void loadInitialTree()
}

const confirmDir = async () => {
  const val = dirDialogResult.value
  if (!val) {
    message.warning('请先选择一个目录')
    return
  }
  if (dirDialogTarget.value === 'default') {
    await saveDefaultDir(val)
  } else {
    form.value.path = val
  }
  dirDialogVisible.value = false
}

const saveDefaultDir = async (val: string) => {
  await ResourceSettingApi.setDefaultDir(val)
  message.success('默认管理目录已更新')
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
        const res = await FileSystemApi.exists(val.trim())
        pathState.value = !!res.data
      } catch {
        pathState.value = null
      }
    }, 300)
  },
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
  if (!form.value.keywords.includes(k)) form.value.keywords.push(k)
  keywordInput.value = ''
}

const removeKeyword = (i: number) => form.value.keywords.splice(i, 1)

const handleToggle = async (row: ManagedResource, val: boolean) => {
  try {
    await ManagedResourceApi.toggle(row.id, val)
    row.enabled = val
    message.success(val ? '已启用' : '已禁用')
  } catch {
    /* 拦截器已弹错 */
  }
}

const handleSave = async () => {
  if (!form.value.name.trim()) return message.warning('资源名称不能为空')
  if (!form.value.path.trim()) return message.warning('目录路径不能为空')
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
      await ManagedResourceApi.update(editingId.value, payload)
      message.success('更新成功')
    } else {
      await ManagedResourceApi.create(payload)
      message.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await ManagedResourceApi.delete(id)
  message.success('删除成功')
  fetchData()
}

onMounted(() => {
  fetchData()
  fetchDefaultDir()
})
</script>
