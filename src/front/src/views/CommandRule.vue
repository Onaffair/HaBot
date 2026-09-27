<template>
  <div class="page-container">
    <a-card :bordered="false">
      <template #title>
        <div class="card-header">
          <span>触发规则管理</span>
          <a-button type="primary" @click="openDialog()">添加规则</a-button>
        </div>
      </template>

      <a-alert
        class="mb-3"
        type="info"
        show-icon
        banner
        message="这些规则在 Bot 启动时从数据库动态注册为命令；配置资源目录需先在「目录管理」中登记对应资源段。"
      />

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
          <template v-if="column.key === 'matchType'">
            <a-tag :color="matchTypeColor(record.matchType)">{{ matchTypeLabel(record.matchType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'keywords'">
            <div class="kw-wrap">
              <a-tag v-for="(k, i) in record.keywords || []" :key="i">{{ k }}</a-tag>
            </div>
          </template>
          <template v-else-if="column.key === 'fileFilter'">
            {{ record.fileFilter || '—' }}
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
              <a-button size="small" type="link" @click="openDialog(record)">编辑</a-button>
              <a-popconfirm
                title="确定删除该规则吗？"
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

    <a-modal
      v-model:open="dialogVisible"
      :title="isEdit ? '编辑触发规则' : '添加触发规则'"
      :width="600"
      :confirm-loading="saving"
      @ok="handleSave"
    >
      <a-form :model="form" layout="vertical" class="pt-2">
        <a-form-item label="命令名" required>
          <a-input v-model:value="form.name" placeholder="例如：哈个气" />
        </a-form-item>
        <a-form-item label="匹配方式">
          <a-radio-group v-model:value="form.matchType" button-style="solid">
            <a-radio-button value="exact">完全相等</a-radio-button>
            <a-radio-button value="contains">包含子串</a-radio-button>
            <a-radio-button value="chars">包含全部字符</a-radio-button>
          </a-radio-group>
          <div class="path-hint">
            完全相等=消息等于关键词；包含子串=消息含关键词；包含全部字符=关键词每个字都出现（如"来首歌"）
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
        </a-form-item>
        <a-form-item label="资源目录" required>
          <a-select
            v-model:value="form.resourceName"
            show-search
            option-filter-prop="label"
            placeholder="选择要发送的资源目录(资源段)"
            :options="resourceOptions.map((r) => ({ label: `${r.name}（${r.path}）`, value: r.name }))"
          />
          <div class="path-hint">发送随机资源前会从该目录的媒体文件中随机选一个</div>
        </a-form-item>
        <a-form-item label="文件名过滤">
          <a-input
            v-model:value="form.fileFilter"
            placeholder="可选：只发送文件名包含该文字的文件（如“你不是我兄弟”）"
          />
        </a-form-item>
        <a-form-item label="优先级">
          <a-input-number v-model:value="form.priority" :min="0" style="width: 160px" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="form.description" :rows="2" placeholder="规则说明（可选）" />
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { CommandRuleApi, ManagedResourceApi } from '@/api'
import type { CommandRule, ManagedResource } from '@/api'

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
  { title: '命令名', dataIndex: 'name', key: 'name', width: 140 },
  { title: '匹配方式', key: 'matchType', width: 130 },
  { title: '触发关键词', key: 'keywords', width: 220 },
  { title: '资源目录', dataIndex: 'resourceName', key: 'resourceName', width: 130 },
  { title: '文件名过滤', key: 'fileFilter', width: 160, ellipsis: true },
  { title: '描述', key: 'description', ellipsis: true },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80, align: 'center' },
  { title: '启用', key: 'enabled', width: 80, align: 'center' },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
]

const tableData = ref<CommandRule[]>([])
const resourceOptions = ref<ManagedResource[]>([])
const loading = ref(false)

const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref(0)
const form = ref<Omit<CommandRule, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '',
  description: '',
  enabled: true,
  matchType: 'contains',
  keywords: [],
  resourceName: '',
  fileFilter: '',
  priority: 0,
})
const keywordInput = ref('')

const matchTypeLabel = (t: string) =>
  (({ exact: '完全相等', contains: '包含子串', chars: '包含全部字符' } as Record<string, string>)[t]) || t
const matchTypeColor = (t: string) =>
  (({ exact: 'orange', contains: 'blue', chars: 'green' } as Record<string, string>)[t]) || 'default'

const fetchData = async () => {
  loading.value = true
  try {
    const res = await CommandRuleApi.list()
    tableData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const fetchResources = async () => {
  const res = await ManagedResourceApi.list()
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
    await CommandRuleApi.toggle(row.id, val)
    row.enabled = val
    message.success(val ? '已启用' : '已禁用')
  } catch {
    /* 拦截器已提示 */
  }
}

const handleSave = async () => {
  if (!form.value.name.trim()) return message.warning('命令名不能为空')
  if (!form.value.resourceName) return message.warning('请选择资源目录')
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      description: (form.value.description || '').trim() || undefined,
      enabled: form.value.enabled,
      matchType: form.value.matchType,
      keywords: form.value.keywords,
      resourceName: form.value.resourceName,
      fileFilter: (form.value.fileFilter || '').trim() || undefined,
      priority: form.value.priority,
    }
    if (isEdit.value) {
      await CommandRuleApi.update(editingId.value, payload)
      message.success('更新成功')
    } else {
      await CommandRuleApi.create(payload)
      message.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await CommandRuleApi.delete(id)
  message.success('删除成功')
  fetchData()
}

onMounted(() => {
  fetchData()
  fetchResources()
})
</script>
