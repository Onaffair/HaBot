<script setup lang="ts">
// ============================================================================
// 消息段编辑器 (MessageSegment 列表的增删改)
// ----------------------------------------------------------------------------
// 作为「消息构建节点」配置表单里的自定义控件，由 BaseForm 的 item.render 挂载。
// - v-model 绑定 MessageSegment[]，每次变更整体回写新数组 (触发上层响应)
// - 段类型与后端 onebot.ts 的 OB11 消息段对齐: text / at / image / video /
//   record(语音) / face / poke，不同类型渲染各自的入参字段
// - 媒体段(图片/视频/语音)的资源路径只能经「浏览目录」选择确定：不提供手填输入框，
//   回显只读；上传、新建目录、删除都在选择树内完成
// ============================================================================
import { computed, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  UploadOutlined,
  FolderOpenOutlined,
  FolderAddOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'
import FileSystemApi from '@/api/fileSystem'
import type { FsNode } from '@/api/types'
import type { MessageSegment, MessageSegmentType } from '../types'

/** 外部双向绑定的消息段数组 */
const segments = defineModel<MessageSegment[]>({ default: () => [] })

/** 单个字段的渲染描述 */
interface FieldDef {
  key: keyof MessageSegment
  label: string
  placeholder?: string
  textarea?: boolean
  /** 资源路径字段: 只读回显, 只能通过目录浏览树选择目录或具体文件 */
  isPath?: boolean
}
/** 段类型的展示与字段配置 */
interface SegmentMeta {
  label: string
  color: string
  fields: FieldDef[]
}

// 段类型元信息: 决定下拉文案、标签配色与该类型需要填写的字段
const SEGMENT_META: Record<MessageSegmentType, SegmentMeta> = {
  text: {
    label: '文字',
    color: 'blue',
    fields: [{ key: 'text', label: '文本内容', placeholder: '输入要发送的文字', textarea: true }],
  },
  at: {
    label: '@某人',
    color: 'purple',
    fields: [
      { key: 'qq', label: 'QQ 号', placeholder: '数字 QQ 号；填 all 表示 @全体' },
      { key: 'name', label: '昵称', placeholder: '可选，仅展示用' },
    ],
  },
  image: {
    label: '图片',
    color: 'cyan',
    fields: [{ key: 'file', label: '图片资源', isPath: true }],
  },
  video: {
    label: '视频',
    color: 'geekblue',
    fields: [{ key: 'file', label: '视频资源', isPath: true }],
  },
  record: {
    label: '语音',
    color: 'gold',
    fields: [{ key: 'file', label: '音频资源', isPath: true }],
  },
  face: {
    label: '表情',
    color: 'magenta',
    fields: [{ key: 'faceId', label: '表情 ID', placeholder: 'QQ 表情编号' }],
  },
  poke: {
    label: '戳一戳',
    color: 'orange',
    fields: [{ key: 'pokeType', label: '类型', placeholder: 'poke 类型标识' }],
  },
}

const typeOptions = (Object.keys(SEGMENT_META) as MessageSegmentType[]).map((t) => ({
  value: t,
  label: SEGMENT_META[t].label,
}))

/** 各类型对应的空字段初值, 保证输入控件受控绑定 */
function blankSegment(type: MessageSegmentType): MessageSegment {
  const seg: MessageSegment = { type }
  if (type === 'text') seg.text = ''
  else if (type === 'at') seg.qq = ''
  else if (type === 'image' || type === 'video' || type === 'record') seg.file = ''
  else if (type === 'face') seg.faceId = ''
  else if (type === 'poke') seg.pokeType = ''
  return seg
}

function addSegment(type: MessageSegmentType) {
  segments.value = [...(segments.value || []), blankSegment(type)]
}

/** 切换某行的段类型: 重置为该类型的空结构 */
function changeType(index: number, type: MessageSegmentType) {
  const arr = [...(segments.value || [])]
  arr[index] = blankSegment(type)
  segments.value = arr
}

function updateField(index: number, key: keyof MessageSegment, val: string) {
  const arr = [...(segments.value || [])]
  arr[index] = { ...arr[index], [key]: val }
  segments.value = arr
}

function removeSegment(index: number) {
  const arr = [...(segments.value || [])]
  arr.splice(index, 1)
  segments.value = arr
}

/** 上移 / 下移调整消息段顺序 */
function move(index: number, dir: -1 | 1) {
  const arr = [...(segments.value || [])]
  const target = index + dir
  if (target < 0 || target >= arr.length) return
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  segments.value = arr
}

/** 读取某段某字段的字符串值 (模板不支持 as 断言, 收敛到此处) */
function segValue(seg: MessageSegment, key: keyof MessageSegment): string {
  return ((seg as Record<string, any>)[key] as string) ?? ''
}

/** 下拉菜单点击: 取 menu item 的 key 作为段类型新增 */
function onAddMenuClick(info: { key: string | number }) {
  addSegment(info.key as MessageSegmentType)
}

/** 行内类型切换 (去掉模板里的类型注解) */
function onTypeChange(index: number, val: string | number) {
  changeType(index, val as MessageSegmentType)
}

/** 字段输入回写 */
function onFieldInput(index: number, key: keyof MessageSegment, val: string) {
  updateField(index, key, val)
}

// --------------------------------------------------------------------------
// 资源选择: 从服务器目录树中下钻, 既可选中「目录」(发送时随机取), 也可选中
// 「具体文件」(发送该文件)。文件按当前段的媒体类型做扩展名过滤, 目录始终可展开。
// 媒体段路径只能经此处确定（回显只读）；路径是目录还是具体文件由底层发送时判断
// (makeResource 约定: 末段带扩展名视为具体文件, 否则视为目录随机选取)。
// 树内直接复用目录管理模块的后端接口 (/filesystem/mkdir | upload | delete),
// 因此新建目录、上传素材、删除资源可以在选资源的过程中顺手完成。
// --------------------------------------------------------------------------
/** 各媒体段允许选择的文件扩展名 (小写); 未列出的类型不过滤 */
const MEDIA_EXTS: Partial<Record<MessageSegmentType, string[]>> = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'],
  record: ['.mp3', '.wav', '.ogg', '.amr', '.m4a', '.flac'],
}

/** 树内上传时本机文件选择框的类型过滤 */
const SEGMENT_UPLOAD_ACCEPT: Partial<Record<MessageSegmentType, string>> = {
  image: 'image/*',
  video: 'video/*',
  record: 'audio/*',
}

/** 资源路径唯一入口的按钮文案（模板与 placeholder 共用，避免两处字面量漂移） */
const PICKER_BUTTON_TEXT = '浏览目录'

const pickerVisible = ref(false)
const pickerTitle = ref('选择资源')
/** 当前选中的路径 (目录或文件) */
const pickerResult = ref('')
/** 待回填的目标字段 */
const pickerTarget = ref<{ index: number; key: keyof MessageSegment } | null>(null)
/** 当前生效的文件扩展名白名单 */
const pickerExts = ref<string[]>([])
/** 当前正在选资源的段类型：树内上传时决定本机文件过滤 */
const pickerSegType = ref<MessageSegmentType | null>(null)
/** 上传用的隐藏文件选择框（按需创建，避免在模板里挂 DOM） */
let pickerFileInput: HTMLInputElement | null = null
const pickerTree = ref<any[]>([])
const pickerSelectedKeys = ref<string[]>([])
/** 受控展开的节点 key 集合（打开时自动定位到目标目录需要以编程方式展开祖先链） */
const pickerExpandedKeys = ref<string[]>([])
/** 当前选中的是否为目录：决定树内新建/上传/删除的作用对象 */
const pickerIsDir = ref(false)

/** 后端 FsNode -> antd Tree 节点 (目录可展开、文件为叶子, 两者均可选中) */
function toPickerNode(n: FsNode) {
  return {
    title: n.label,
    key: n.key || n.path,
    path: n.path,
    isDir: n.isDir,
    isLeaf: !!n.leaf,
    selectable: true,
    children: undefined,
  }
}

/** 文件名是否命中当前媒体类型的扩展名白名单 */
function matchExt(name: string): boolean {
  const exts = pickerExts.value
  if (!exts.length) return true
  const lower = name.toLowerCase()
  return exts.some((e) => lower.endsWith(e))
}

/** 拉取并写回某目录节点的子节点（目录 + 按媒体类型过滤后的文件） */
async function loadChildren(node: any): Promise<void> {
  const dirPath: string = node.path ?? node.data?.path ?? ''
  if (!dirPath) return
  const res = await FileSystemApi.entries(dirPath)
  const list = (res.data || []).filter((n) => n.isDir || matchExt(n.label))
  const children = list.map(toPickerNode)
  // 懒加载回调收到的是内部扁平化出的临时副本（原始字段被 spread 进来），
  // 直接改它的 children 不会落到 pickerTree 源节点上，子目录便渲染不出。
  // dataRef 指向源数据对象；按 key 定位源节点作为兜底，回写后再整体替换数组引用。
  const original =
    node.dataRef ?? findPickerNodeByKey(pickerTree.value, String(node.key ?? dirPath))
  if (original) original.children = children
  pickerTree.value = [...pickerTree.value]
}

/** 在树数据中按 key 查找源节点（含子层），用于懒加载回写定位 */
function findPickerNodeByKey(nodes: any[], key: string): any | null {
  for (const n of nodes) {
    if (String(n.key) === key) return n
    if (n.children?.length) {
      const hit = findPickerNodeByKey(n.children, key)
      if (hit) return hit
    }
  }
  return null
}

/** 展开某目录节点: 懒加载其子目录 + 过滤后的文件 */
async function loadPickerNode(node: any): Promise<void> {
  await loadChildren(node)
}

/** 取路径的父目录（Windows / POSIX 分隔符都兼容） */
function parentPath(p: string): string {
  return p.replace(/[\\/][^\\/]*[/\\]?$/, '')
}

/** 统一路径比较形式：反斜杠转正斜杠、去尾部分隔符、转小写（Windows 大小写不敏感） */
function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

/** target 目录是否位于 root 之下（不相等） */
function isUnder(targetNorm: string, rootNorm: string): boolean {
  return targetNorm.startsWith(rootNorm + '/')
}

/**
 * 枚举 root 之下、直到 dirNorm（含）的每一级祖先目录归一化路径，
 * 供懒加载逐层下钻时按路径匹配子节点。root 与 dir 相等时返回空。
 */
function ancestorsOf(rootNorm: string, dirNorm: string): string[] {
  if (dirNorm === rootNorm) return []
  const base = rootNorm.endsWith('/') ? rootNorm : rootNorm + '/'
  const chain: string[] = []
  let cur = base
  for (const seg of dirNorm.slice(base.length).split('/').filter(Boolean)) {
    cur += seg
    chain.push(cur)
    cur += '/'
  }
  return chain
}

/**
 * 打开目录树时定位：从匹配的根节点出发逐层懒加载，展开到 targetPath 所在目录。
 * select=true 时把 targetPath（目录或文件）选中并回填「已选择/操作目录」状态；
 * select=false 仅展开露出该目录，不产生选择（用于无历史选中时定位到项目根目录）。
 */
async function revealTo(targetPath: string, select: boolean): Promise<void> {
  if (!targetPath) return
  const isFile = /\.[^.\\/]+$/.test(targetPath)
  const dirPath = isFile ? parentPath(targetPath) : targetPath
  const dirNorm = normPath(dirPath)
  if (!dirNorm) return
  // 锚定到包含目标目录的那个根（Home / 磁盘盘符）
  let node =
    pickerTree.value.find((r: any) => normPath(r.path) === dirNorm) ||
    pickerTree.value.find((r: any) => isUnder(dirNorm, normPath(r.path)))
  if (!node) return
  const expanded: string[] = [String(node.key)]
  for (const expected of ancestorsOf(normPath(node.path), dirNorm)) {
    await loadChildren(node)
    const child = (node.children || []).find((c: any) => normPath(c.path) === expected)
    if (!child) return // 中途目录缺失/被过滤，保持已展开部分
    expanded.push(String(child.key))
    node = child
  }
  // 展开目标目录自身，露出其内容
  await loadChildren(node)
  expanded.push(String(node.key))
  pickerExpandedKeys.value = Array.from(new Set(expanded))
  if (!select) return
  let selected = String(node.key)
  if (isFile) {
    const fileNode = (node.children || []).find((c: any) => normPath(c.path) === normPath(targetPath))
    if (fileNode) selected = String(fileNode.key)
  }
  pickerSelectedKeys.value = [selected]
  pickerResult.value = targetPath
  pickerIsDir.value = !isFile
}

/**
 * 在树中定位已展开的目录节点：命中就能直接刷新其子节点。
 * 未命中返回 null，此时保持原状，用户下次展开该目录时自然拉到最新内容。
 */
function locateDirNode(dirPath: string): any | null {
  const dirKey = dirPath.replace(/[\\/]+$/, '')
  for (const root of pickerTree.value) {
    const hit = findPickerNode(root, dirKey)
    if (hit) return hit
  }
  return null
}

/** 深度优先查找 key 对应的树节点 */
function findPickerNode(node: any, key: string): any | null {
  if (String(node.key) === key) return node
  for (const child of node.children || []) {
    const hit = findPickerNode(child, key)
    if (hit) return hit
  }
  return null
}

function onPickerSelect(keys: (string | number)[], info: any) {
  const node = info?.node
  if (!node) return
  pickerResult.value = node.path || String(keys[0] ?? '')
  pickerSelectedKeys.value = [String(keys[0] ?? '')]
  pickerIsDir.value = node.isDir !== false
}

/** 打开选择树: 依当前段类型设定扩展名过滤, 根节点用系统候选目录 */
function openPicker(index: number, key: keyof MessageSegment) {
  const seg = segments.value?.[index]
  pickerTarget.value = { index, key }
  pickerSegType.value = seg ? seg.type : null
  pickerExts.value = seg ? MEDIA_EXTS[seg.type] ?? [] : []
  pickerTitle.value = seg
    ? `选择${SEGMENT_META[seg.type].label}资源（目录或文件）`
    : '选择资源（目录或文件）'
  pickerResult.value = seg ? segValue(seg, key) : ''
  // 仅按「末段是否带扩展名」粗判已存路径的类型，精确判定以实际点选为准
  pickerIsDir.value = !!pickerResult.value && !/\.[^.\\/]+$/.test(pickerResult.value)
  pickerSelectedKeys.value = []
  pickerExpandedKeys.value = []
  pickerVisible.value = true
  void initPickerTree()
}

async function initPickerTree(): Promise<void> {
  pickerTree.value = []
  const roots = await FileSystemApi.roots()
  pickerTree.value = (roots.data || []).map(toPickerNode)
  // 有历史选中 -> 展开并定位到它；从未选过 -> 展开到本项目目录（仅露出、不选中）
  if (pickerResult.value) {
    await revealTo(pickerResult.value, true)
  } else {
    const project = await FileSystemApi.projectRoot()
    if (project.data) await revealTo(project.data, false)
  }
}

/** 确认: 把选中的目录 / 文件路径回填到目标字段 */
function confirmPicker() {
  if (!pickerResult.value) {
    message.warning('请先选择一个目录或文件')
    return
  }
  const target = pickerTarget.value
  if (target) updateField(target.index, target.key, pickerResult.value)
  pickerVisible.value = false
}

// --------------------------------------------------------------------------
// 树内资源管理: 作用目录 = 选中的目录，或选中文件所在的父目录；
// 操作完成后刷新对应树节点（未展开时下次展开自然拉到新内容）。
// --------------------------------------------------------------------------
/** 新建 / 上传 / 删除共同作用的目标目录 */
const pickerTargetDir = computed(() => {
  const sel = pickerResult.value
  if (!sel) return ''
  return pickerIsDir.value ? sel : parentPath(sel)
})

const mkdirVisible = ref(false)
const mkdirSaving = ref(false)
const mkdirName = ref('')
const deleting = ref(false)
/** 上传中标记 */
const pickerUploading = ref(false)

/** 目录未选中时给出提示，树内管理操作统一前置校验 */
function ensureTargetDir(): string {
  if (!pickerTargetDir.value) {
    message.warning('请先在左侧选择一个目录')
    return ''
  }
  return pickerTargetDir.value
}

// ===== 新建子目录 =====
function openMkdir() {
  if (!ensureTargetDir()) return
  mkdirName.value = ''
  mkdirVisible.value = true
}

async function confirmMkdir() {
  const name = mkdirName.value.trim()
  const parent = pickerTargetDir.value
  if (!name || !parent) return
  mkdirSaving.value = true
  try {
    const res = await FileSystemApi.mkdir(parent, name)
    message.success(`目录 ${name} 创建成功`)
    mkdirVisible.value = false
    const created = res.data?.path
    if (created) {
      await refreshChildrenOf(parent)
      // 顺手选中新目录，保存消息段即指向它
      pickerResult.value = created
      pickerIsDir.value = true
      pickerSelectedKeys.value = [created]
    }
  } finally {
    mkdirSaving.value = false
  }
}

// ===== 上传资源到目标目录 =====
function triggerPickerUpload() {
  const dir = ensureTargetDir()
  if (!dir) return
  if (!pickerFileInput) {
    pickerFileInput = document.createElement('input')
    pickerFileInput.type = 'file'
    pickerFileInput.multiple = true
    pickerFileInput.addEventListener('change', onPickerFilesChosen)
  }
  // 媒体类型过滤按当前段类型（图片 image/*、视频 video/*、语音 audio/*）
  pickerFileInput.accept =
    (pickerSegType.value && SEGMENT_UPLOAD_ACCEPT[pickerSegType.value]) || ''
  pickerFileInput.value = ''
  pickerFileInput.click()
}

async function onPickerFilesChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  const dir = pickerTargetDir.value
  if (!files.length || !dir) return
  pickerUploading.value = true
  try {
    const res = await FileSystemApi.upload(dir, files)
    const uploaded = res.data?.files || []
    message.success(`已上传 ${uploaded.length} 个文件到 ${dir}`)
    await refreshChildrenOf(dir)
    // 单文件上传后直接选中该文件，省去再点一次
    if (uploaded.length === 1) {
      pickerResult.value = uploaded[0]
      pickerIsDir.value = false
      pickerSelectedKeys.value = [uploaded[0]]
    }
  } finally {
    pickerUploading.value = false
  }
}

// ===== 删除选中资源（文件整体删除；目录仅在其为空时删除）=====
function removeSelected() {
  const target = pickerResult.value
  if (!target) {
    message.warning('请先选择要删除的目录或文件')
    return
  }
  Modal.confirm({
    title: '删除资源',
    content: `确认删除「${target}」？目录仅在为空时可删除，文件删除后不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      deleting.value = true
      try {
        await FileSystemApi.remove(target)
        message.success('已删除')
        const dir = pickerIsDir.value ? parentPath(target) : target
        pickerResult.value = ''
        pickerSelectedKeys.value = []
        if (dir) await refreshChildrenOf(dir)
      } finally {
        deleting.value = false
      }
    },
  })
}

/** 重新拉取某目录的子节点（目录不在树中或尚未展开时跳过） */
async function refreshChildrenOf(dirPath: string): Promise<void> {
  const node = locateDirNode(dirPath)
  if (!node) return
  await loadChildren(node)
}
</script>

<template>
  <div class="segment-editor">
    <a-empty v-if="!segments || segments.length === 0" description="暂无消息段" :image="false" />

    <div v-for="(seg, i) in segments" :key="i" class="segment-editor__item">
      <div class="segment-editor__head">
        <a-tag :color="SEGMENT_META[seg.type] && SEGMENT_META[seg.type].color">
          {{ SEGMENT_META[seg.type] && SEGMENT_META[seg.type].label }}
        </a-tag>
        <a-select
          :value="seg.type"
          size="small"
          style="width: 110px"
          :options="typeOptions"
          @change="onTypeChange(i, $event)"
        />
        <a-space class="segment-editor__ops">
          <a-button size="small" :disabled="i === 0" @click="move(i, -1)">↑</a-button>
          <a-button size="small" :disabled="i === segments.length - 1" @click="move(i, 1)">↓</a-button>
          <a-button size="small" danger @click="removeSegment(i)">删除</a-button>
        </a-space>
      </div>

      <div class="segment-editor__fields">
        <div
          v-for="f in SEGMENT_META[seg.type] && SEGMENT_META[seg.type].fields"
          :key="String(f.key)"
          class="segment-editor__field"
        >
          <span class="segment-editor__label">{{ f.label }}</span>
          <div class="segment-editor__ctrl">
            <!-- 资源字段: 路径只读回显, 只能通过下方「浏览目录」选择确定 -->
            <template v-if="f.isPath">
              <a-input
                :value="segValue(seg, f.key)"
                readonly
                :placeholder="`未选择，点右侧「${PICKER_BUTTON_TEXT}」从服务器目录中挑选`"
              />
              <a-button size="small" @click="openPicker(i, f.key)">
                <FolderOpenOutlined />
                {{ PICKER_BUTTON_TEXT }}
              </a-button>
            </template>
            <a-textarea
              v-else-if="f.textarea"
              :value="segValue(seg, f.key)"
              :placeholder="f.placeholder"
              :auto-size="{ minRows: 2, maxRows: 4 }"
              @update:value="onFieldInput(i, f.key, $event)"
            />
            <a-input
              v-else
              :value="segValue(seg, f.key)"
              :placeholder="f.placeholder"
              @update:value="onFieldInput(i, f.key, $event)"
            />
          </div>
        </div>
      </div>
    </div>

    <a-dropdown :trigger="['click']">
      <a-button type="dashed" block class="segment-editor__add">+ 添加消息段</a-button>
      <template #overlay>
        <a-menu @click="onAddMenuClick">
          <a-menu-item v-for="opt in typeOptions" :key="opt.value">{{ opt.label }}</a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>

    <!-- 资源选择树: 目录可展开并选中(发送时随机), 文件为叶子可选中(发送具体文件) -->
    <a-modal v-model:open="pickerVisible" :title="pickerTitle" :width="620">
      <a-alert
        class="segment-editor__picker-tip"
        type="info"
        show-icon
        message="选「目录」发送时随机取其中资源；选「文件」则发送该具体文件。可在树内直接新建目录、上传与删除素材。"
      />
      <a-tree
        v-if="pickerVisible"
        :tree-data="pickerTree as any"
        :load-data="loadPickerNode as any"
        v-model:selectedKeys="pickerSelectedKeys"
        v-model:expandedKeys="pickerExpandedKeys"
        block-node
        class="segment-editor__picker-tree"
        @select="onPickerSelect"
      >
        <template #title="node">
          <FolderOpenOutlined v-if="node.isDir" class="segment-editor__picker-icon" />
          <span>{{ node.title }}</span>
        </template>
      </a-tree>
      <div class="segment-editor__picker-path">
        已选择：<span class="segment-editor__picker-path-val">{{
          pickerResult || '（尚未选择目录或文件）'
        }}</span>
      </div>

      <!-- 树内资源管理: 作用对象为选中目录，或选中文件所在的父目录 -->
      <div class="segment-editor__picker-ops">
        <span class="segment-editor__picker-ops-tip">
          操作目录：<span class="segment-editor__picker-path-val">{{
            pickerTargetDir || '（未选择）'
          }}</span>
        </span>
        <a-space>
          <a-button size="small" :disabled="!pickerTargetDir" @click="openMkdir">
            <FolderAddOutlined />
            新建目录
          </a-button>
          <a-button size="small" :disabled="!pickerTargetDir" :loading="pickerUploading" @click="triggerPickerUpload">
            <UploadOutlined />
            上传到此目录
          </a-button>
          <a-button
            size="small"
            danger
            :disabled="!pickerResult"
            :loading="deleting"
            @click="removeSelected"
          >
            <DeleteOutlined />
            删除
          </a-button>
        </a-space>
      </div>

      <template #footer>
        <a-space>
          <a-button @click="pickerVisible = false">取消</a-button>
          <a-button type="primary" @click="confirmPicker">确定</a-button>
        </a-space>
      </template>
    </a-modal>

    <!-- 新建子目录 -->
    <a-modal
      v-model:open="mkdirVisible"
      title="新建子目录"
      :width="420"
      :confirm-loading="mkdirSaving"
      @ok="confirmMkdir"
    >
      <a-input
        v-model:value="mkdirName"
        placeholder="输入目录名，将在上述操作目录下创建"
        @press-enter="confirmMkdir"
      />
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.segment-editor {
  &__item {
    padding: @spacing-sm;
    margin-bottom: @spacing-sm;
    background: @layout-bg;
    border: 1px solid @border-color-split;
    border-radius: @radius-md;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
    margin-bottom: @spacing-sm;
  }

  &__ops {
    margin-left: auto;
  }

  &__field {
    display: flex;
    align-items: flex-start;
    gap: @spacing-sm;
    margin-top: @spacing-xs;
  }

  &__ctrl {
    display: flex;
    flex: 1 1 auto;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;

    // 浏览目录按钮不被长路径挤压，与只读输入框顶部对齐
    :deep(.ant-btn) {
      flex-shrink: 0;
    }
  }

  &__label {
    flex: 0 0 60px;
    padding-top: 4px;
    color: @text-color-secondary;
    font-size: 12px;
  }

  &__fields {
    :deep(.ant-input),
    :deep(.ant-input-affix-wrapper) {
      flex: 1 1 auto;
      min-width: 0;
    }
  }

  // 资源路径只读回显：灰底不可编辑，视觉上不诱导点击输入
  &__ctrl :deep(input.ant-input[readonly]) {
    color: @text-color-secondary;
    background: @layout-bg;
    cursor: default;
  }

  &__add {
    margin-top: @spacing-xs;
  }

  &__picker-tip {
    margin-bottom: @spacing-sm;
  }

  &__picker-tree {
    max-height: 46vh;
    padding: @spacing-xs;
    overflow: auto;
    border: 1px solid @border-color-split;
    border-radius: @radius-md;
  }

  &__picker-icon {
    margin-right: 4px;
    color: @text-color-secondary;
  }

  &__picker-path {
    margin-top: @spacing-sm;
    color: @text-color-secondary;
    font-size: 13px;
    word-break: break-all;
  }

  &__picker-ops {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: @spacing-sm;
    margin-top: @spacing-xs;
  }

  &__picker-ops-tip {
    flex: 1 1 auto;
    overflow: hidden;
    color: @text-color-secondary;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__picker-path-val {
    color: @brand-color;
  }
}
</style>
