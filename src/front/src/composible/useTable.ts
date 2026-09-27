
import { onBeforeUnmount, reactive, ref, watch } from "vue";
import type { Ref } from "vue";

const defaultPagination = { pageSize: 10, pageNum: 1, total: 0 }

/**
 * 表格分页数据 hook
 * @param api 数据接口，入参为 { ...搜索参数, pageSize, pageNum }，返回值须含顶层 { list, total }（RESTful 分页格式）
 * @param defaultSearchParams 搜索参数（属性变化即自动触发请求）
 */
export function useTable<T = any>(
  api: (...args: any) => Promise<any>,
  defaultSearchParams: Record<string, any> = {},
  option = {},
) {
  const pagination = reactive({ ...defaultPagination })
  const dataSource = ref<T[]>([]) as Ref<T[]>
  const params = reactive({ ...defaultSearchParams })
  const loading = ref(false)

  const unWatch = watch([params, () => pagination.pageSize, () => pagination.pageNum], async () => {
    try {
      loading.value = true
      const res = await api({
        ...params,
        pageSize: pagination.pageSize,
        pageNum: pagination.pageNum
      })
      const { list, total } = res
      pagination.total = total
      dataSource.value = list
    } finally {
      loading.value = false
    }
  }, {
    deep: true,
    immediate: true
  })

  onBeforeUnmount(() => {
    unWatch()
  })

  return {
    pagination,
    dataSource,
    params,
    loading
  }
}





