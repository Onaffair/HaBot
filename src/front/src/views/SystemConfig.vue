<template>
  <div>
    <!-- 顶部操作栏：待保存提示 + 重置 / 保存 -->
    <a-card :bordered="false" class="mb-4">
      <div class="flex items-center justify-between gap-4">
        <div class="text-sm text-gray-500">
          配置项保存在数据库中，保存后即时生效；标记
          <a-tag color="orange">需重启</a-tag>
          的连接参数在保存时会自动重启 Bot 重新建立连接
        </div>
        <a-space>
          <span v-if="changedKeys.length" class="text-sm text-orange-500">
            {{ changedKeys.length }} 项待保存
          </span>
          <a-button :disabled="!changedKeys.length" @click="resetChanges">重置</a-button>
          <a-button type="primary" :loading="saving" :disabled="!changedKeys.length" @click="save">
            保存
          </a-button>
        </a-space>
      </div>
    </a-card>

    <a-spin :spinning="loading">
      <a-empty v-if="!groups.length && !loading" description="暂无可配置项" />

      <a-card v-for="group in groups" :key="group.category" :title="group.label" :bordered="false" class="mb-4">
        <a-form layout="vertical" :colon="false">
          <a-row :gutter="24">
            <a-col v-for="item in group.items" :key="item.key" :xs="24" :md="12">
              <a-form-item>
                <template #label>
                  <span class="mr-2">{{ item.label }}</span>
                  <a-tag v-if="item.requiresRestart" color="orange">需重启</a-tag>
                </template>

                <a-input-password
                  v-if="item.type === 'password'"
                  v-model:value="formState[item.key]"
                  :placeholder="item.description || item.key"
                />
                <a-input-number
                  v-else-if="item.type === 'number'"
                  class="w-full"
                  :value="toNumber(formState[item.key])"
                  :placeholder="item.description || item.key"
                  @update:value="(v: any) => (formState[item.key] = v === null || v === undefined ? '' : String(v))"
                />
                <a-input
                  v-else
                  v-model:value="formState[item.key]"
                  :placeholder="item.description || item.key"
                />

                <!-- 配置键名：便于对照后端读取的 key -->
                <div class="mt-1 text-xs text-gray-400">{{ item.key }}</div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
// ============================================================================
// 系统配置管理页
// ----------------------------------------------------------------------------
// 数据源为 /api/system-configs（DB 中的 SystemConfig 表），按 category 分区渲染表单；
// 表单值与加载值做差异比对，仅把变化的项 PUT 回后端。
// 若变化项中含 requiresRestart=true 且 Bot 正在运行，后端会自动重启 Bot，
// 此处根据返回的 restarted / restartError 给出对应提示。
// ============================================================================
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SystemConfigApi } from '@/api'
import type { SystemConfigGroup } from '@/api/types'

const groups = ref<SystemConfigGroup[]>([])
/** 后端加载的原始值（用于 diff 与重置） */
const original = ref<Record<string, string>>({})
/** 表单当前值 */
const formState = ref<Record<string, string>>({})

const loading = ref(false)
const saving = ref(false)

/** 与原始值不同的 key 列表 */
const changedKeys = computed(() =>
  Object.keys(original.value).filter((key) => (formState.value[key] ?? '') !== original.value[key]),
)

/** 需要重启 Bot 才生效的 key（供保存后判断提示语） */
const restartKeys = computed(() => new Set(
  groups.value.flatMap((group) => group.items).filter((item) => item.requiresRestart).map((item) => item.key),
))

function toNumber(value?: string) {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

async function load() {
  loading.value = true
  try {
    const res = await SystemConfigApi.list()
    groups.value = res?.groups ?? []
    const values: Record<string, string> = {}
    for (const group of groups.value) {
      for (const item of group.items) values[item.key] = item.value ?? ''
    }
    original.value = values
    formState.value = { ...values }
  } catch {
    /* 拦截器已弹错 */
  } finally {
    loading.value = false
  }
}

function resetChanges() {
  formState.value = { ...original.value }
}

async function save() {
  saving.value = true
  try {
    const items = changedKeys.value.map((key) => ({ key, value: formState.value[key] ?? '' }))
    const { updated = [], restarted, restartError } = await SystemConfigApi.save(items)
    if (restartError) {
      message.warning(`参数已更新，但 Bot 重启失败：${restartError}`)
    } else if (restarted) {
      message.success('相关参数已更新，Bot 已自动重启')
    } else if (updated.some((key) => restartKeys.value.has(key))) {
      message.info('已保存，连接参数将在 Bot 下次启动时生效')
    } else {
      message.success(`已保存 ${updated.length} 项配置`)
    }
    await load()
  } catch {
    /* 拦截器已弹错 */
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
