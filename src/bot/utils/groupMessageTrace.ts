import { Redis } from '@/utils/redis'

/**
 * 群消息轨迹记录。
 *
 * 供 +1 等命令判断「当前消息是否与上一条群消息连续一致」。
 * 记录动作必须对每一条进入命令层的群消息都执行，因此由过滤器层调用
 * （traceGroupMessage），命令层只读取判断（getPreviousGroupMessage），
 * 避免因更高优先级命令提前命中导致轨迹缺失、进而误判连续。
 */
const redis = Redis.getInstance()

const LAST_PREFIX = 'group:lastMsg:'
const PREV_PREFIX = 'group:prevMsg:'
const TTL = 24 * 60 * 60 * 1000

/** 消息内容序列化为可比较字符串 */
function serialize(message: any): string {
  return JSON.stringify(message ?? null)
}

/** 记录一条群消息：将原「最近消息」下沉为「上一条」，当前消息写入「最近消息」 */
export function traceGroupMessage(groupId: string | number, message: any): void {
  const gid = String(groupId)
  const last = redis.get(LAST_PREFIX + gid)
  redis.set(PREV_PREFIX + gid, last?.value ?? null, TTL)
  redis.set(LAST_PREFIX + gid, serialize(message), TTL)
}

/** 获取该群「当前消息的上一条」内容（序列化字符串），无则 null */
export function getPreviousGroupMessage(groupId: string | number): string | null {
  return redis.get(PREV_PREFIX + String(groupId))?.value ?? null
}
