<script setup lang="ts">
// ============================================================================
// Canvas — 基于 vue-flow 的节点画布
// ----------------------------------------------------------------------------
// - 引入 './nodes' 触发自注册，画布/工具栏/配置面板全部由 nodeRegistry 驱动
// - nodeTypes 由注册表动态映射 (type → 自定义节点组件)
// - 左侧工具栏按注册顺序生成「添加节点」按钮
// - 选中节点后右侧抽屉渲染其配置表单 (BaseForm)：编辑期改动落到草稿 draft，
//   点「完成」经校验后写回 node.data (v-model 绑定 modelValue)
// - 路由 /canvas/:id 定位画布记录：进入时从后端加载，点「保存画布」整体提交
// ============================================================================
import { computed, markRaw, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  VueFlow,
  MarkerType,
  useVueFlow,
  type Connection,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

import { BaseForm, deepClone } from '@/component/antd'
import { CanvasApi } from '@/api'
import type { CanvasRecord } from '@/api/types'
import { nodeRegistry } from './registry'
import { OpenConfigKey } from './panelContext'
import './nodes' // 副作用：注册全部自定义节点定义

// vue-flow 基础样式
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const { onConnect: onConnectEvent } = useVueFlow({ id: 'habot-canvas' })

// --------------------------------------------------------------------------
// 状态
// --------------------------------------------------------------------------
// 采用轻量画布类型 (结构兼容 vue-flow 的 Node/Edge)，避免其复杂泛型参与推断
interface CanvasNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
}
interface CanvasEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  [key: string]: any
}

const nodes = ref<CanvasNode[]>([])
const edges = ref<CanvasEdge[]>([])
const selectedId = ref<string>('')

/** 自增序号，保证节点 id 唯一 */
let seq = 0
const nextId = (type: string) => `${type}-${++seq}`

// --------------------------------------------------------------------------
// 画布持久化：路由 /canvas/:id 定位画布记录，进入时加载、手动整体保存
// --------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const canvasId = computed(() => Number(route.params.id) || 0)
const meta = ref<CanvasRecord | null>(null)
const saving = ref(false)

/** 从后端加载画布：还原节点/连线，并把自增序号恢复到已有 id 的最大后缀 */
async function loadCanvas() {
  if (!canvasId.value) return
  try {
    const data = await CanvasApi.get(canvasId.value)
    meta.value = data
    nodes.value = (data.nodes || []) as CanvasNode[]
    edges.value = (data.edges || []) as CanvasEdge[]
    let max = 0
    for (const n of nodes.value) {
      const m = /(\d+)$/.exec(n.id)
      if (m) max = Math.max(max, parseInt(m[1], 10))
    }
    seq = Math.max(seq, max)
  } catch {
    message.error('画布加载失败')
  }
}

/** 保存：nodes/edges 整体提交（后端透传存储 JSON） */
async function saveCanvas() {
  if (!canvasId.value) return
  saving.value = true
  try {
    await CanvasApi.update(canvasId.value, {
      nodes: nodes.value.map(({ id, type, position, data }) => ({ id, type, position, data })),
      edges: edges.value,
    })
    message.success('已保存')
  } finally {
    saving.value = false
  }
}

watch(canvasId, loadCanvas, { immediate: true })

/** type → 自定义节点组件，交给 vue-flow 按 node.type 解析 */
const nodeTypes = computed(() => {
  const map: Record<string, any> = {}
  for (const def of nodeRegistry.list()) map[def.type] = markRaw(def.component)
  return map as any
})

/** 工具栏可选节点类别 */
const palette = computed(() => nodeRegistry.list())

// --------------------------------------------------------------------------
// 选中态 (仅用于「删除选中」) 与配置面板状态 (由节点设置图标触发)
// --------------------------------------------------------------------------
const selectedNode = computed(() => nodes.value.find((n) => n.id === selectedId.value) || null)

/** 配置面板打开的节点 id: 与选中态解耦, 仅点击节点上的设置图标才置位 */
const configId = ref<string>('')
const configNode = computed(() => nodes.value.find((n) => n.id === configId.value) || null)
const configDef = computed(() =>
  configNode.value ? nodeRegistry.resolve(configNode.value.type as any) : null,
)
/** 配置表单 schema (无打开节点时给空 schema 兜底) */
const configSchema = computed(() => configDef.value?.formSchema ?? { form: {}, fields: [] })

/**
 * 配置表单的工作副本: 编辑期间所有改动落到 draft, 点「完成」再写回 node.data。
 * 通过 v-model 绑定 BaseForm 的 modelValue (BaseForm 用 defineModel 管理该值)。
 */
const draft = ref<Record<string, any>>({})
/** BaseForm 实例引用: 完成时触发校验 */
const formRef = ref<any>()

// 打开/切换配置节点时, 用其 data 深拷贝初始化草稿 (未保存即切走/关闭则丢弃)
watch(configNode, (node) => {
  draft.value = node ? (deepClone(node.data) as Record<string, any>) : {}
})

// 供节点组件 (BaseNode) 注入: 点击设置图标打开对应节点的配置面板 (并同步选中)
provide(OpenConfigKey, (nodeId: string) => {
  selectedId.value = nodeId
  configId.value = nodeId
})

// --------------------------------------------------------------------------
// 交互
// --------------------------------------------------------------------------
function addNode(type: string) {
  const def = nodeRegistry.resolve(type as any)
  if (!def) return
  const id = nextId(type)
  // 以自增序号铺开，避免新节点完全重叠
  nodes.value.push({
    id,
    type,
    position: { x: 120 + (seq % 6) * 40, y: 80 + (seq % 6) * 40 },
    data: def.createData() as any,
  })
  selectedId.value = id
}

function onNodeClick(payload: { node: CanvasNode }) {
  selectedId.value = payload.node.id
}

/** 点击画布空白处: 取消选中并关闭配置面板 */
function onPaneClick() {
  selectedId.value = ''
  configId.value = ''
}

/** 完成: 触发 BaseForm 校验并取值 (submit 内部 emit update:modelValue 回写 draft), 校验通过后写回节点 data */
async function confirmConfig() {
  const node = configNode.value
  if (!node) return
  try {
    // submit 先校验, 通过后 emit update:modelValue 回写 draft; 失败会 reject, 保持抽屉打开
    await formRef.value?.submit?.()
  } catch {
    return // 校验未通过, 保持抽屉打开
  }
  console.log(draft.value);
  
  // 深拷贝隔离, 避免草稿与节点数据共享引用
  node.data = deepClone(draft.value) as Record<string, any>
  configId.value = ''
}

function removeSelected() {
  if (!selectedId.value) return
  const id = selectedId.value
  nodes.value = nodes.value.filter((n) => n.id !== id)
  edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
  selectedId.value = ''
  if (configId.value === id) configId.value = ''
}

function clearAll() {
  nodes.value = []
  edges.value = []
  selectedId.value = ''
  configId.value = ''
}

// 连线：新增一条带动画与箭头的边
onConnectEvent((params: Connection) => addEdge(params))
function addEdge(params: Connection) {
  edges.value.push({
    ...params,
    id: `e-${params.source}-${params.sourceHandle ?? ''}->${params.target}-${params.targetHandle ?? ''}`,
    animated: true,
    markerEnd: MarkerType.ArrowClosed,
  })
}

// 导出当前画布 JSON（供后续持久化 / 调试）
function exportGraph() {
  return JSON.stringify(
    { nodes: nodes.value.map(({ id, type, position, data }) => ({ id, type, position, data })), edges: edges.value },
    null,
    2,
  )
}
</script>

<template>
  <div class="canvas-page">
    <!-- 左侧：节点工具栏 -->
    <aside class="canvas-palette">
      <div class="canvas-palette__title">{{ meta?.name || '流程画布' }}</div>
      <a-button
        v-for="def in palette"
        :key="def.type"
        class="canvas-palette__item"
        block
        @click="addNode(def.type)"
      >
        <span class="canvas-palette__dot" :style="{ background: def.color }" />
        {{ def.icon }} {{ def.label }}
      </a-button>

      <a-divider style="margin: 12px 0" />
      <a-space direction="vertical" style="width: 100%">
        <a-button block type="primary" :loading="saving" @click="saveCanvas">保存画布</a-button>
        <a-button block :disabled="!selectedId" danger @click="removeSelected">删除选中</a-button>
        <a-button block @click="clearAll">清空画布</a-button>
        <a-button block @click="router.push('/canvas')">返回列表</a-button>
      </a-space>
    </aside>

    <!-- 中间：画布 -->
    <div class="canvas-flow">
      <VueFlow
        id="habot-canvas"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :min-zoom="0.2"
        :max-zoom="2"
        :default-viewport="{ zoom: 1 }"
        fit-view-on-init
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
      >
        <Background :gap="16" pattern="dots" />
        <Controls />
        <MiniMap pannable zoomable />
      </VueFlow>
    </div>

    <!-- 右侧：点击节点设置图标后打开的配置面板 -->
    <a-drawer
      :open="!!configNode"
      :title="configDef ? `${configDef.icon} ${configDef.label} 配置` : '配置'"
      placement="right"
      :width="420"
      @close="onPaneClick"
    >
      <BaseForm
        v-if="configNode"
        ref="formRef"
        :key="configNode.id"
        v-model="draft"
        :schema="configSchema"
      />
      <template #footer>
        <div class="canvas-drawer__footer">
          <a-button @click="console.log(exportGraph())">导出 JSON</a-button>
          <a-button type="primary" @click="confirmConfig">完成</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.canvas-page {
  display: flex;
  height: calc(100vh - 108px); // 减去顶栏(60) 与内容区上下内边距
  background: @layout-bg;
} 

.canvas-palette {
  flex: 0 0 180px;
  padding: @spacing-md;
  background: #fff;
  border-right: 1px solid @border-color-split;

  &__title {
    margin-bottom: @spacing-sm;
    font-weight: 600;
    color: @text-color;
  }

  &__item {
    margin-bottom: @spacing-sm;
    text-align: left;
  }

  &__dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    vertical-align: middle;
    border-radius: 50%;
  }
}

.canvas-flow {
  position: relative;
  flex: 1 1 auto;
}

.canvas-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: @spacing-sm;
}
</style>
