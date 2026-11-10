import { Command } from "@/core/command";
import { MessageBuilder, makeResource } from "@/utils/messageBuilder";
import { createLogger } from "@utils/logger";
import { foodArr } from "@/config";
import { Redis } from "@/utils/redis";

const logger = createLogger('Reactions');

// ======================================================================
// 配置化行为说明：
//  「关键词/正则 → 发送资源」这类可由运营配置的行为已全部改由流程画布表达
//  （见 commands/canvasFlow 与 views/canvas），原「目录管理」(managed_resources)
//  与「触发规则」(command_rules) 模块已移除，不再注册任何动态命令。
//  bot 与后端同进程，运行期后端改库后直接调用 core/runtime（runtime.upsertCanvas /
//  refreshGroups）同步画布缓存与群数据，无跨进程通知。
// 资源引用一律走文件系统路径：相对值以 RESOURCE_PATH 为基准，实时解析、无需刷新缓存
// （见 utils/resourcePath），故本文件的 makeResource('bluelock') 指向 RESOURCE_PATH/bluelock。
// 本文件仅保留需 @成员 / Redis 状态机等复合行为的硬编码命令。
// ======================================================================

// ========== 应激命令（保留：需 @成员 + 文本的复合行为） ==========
export const yinjiCmd: Command = {
  name: '应激',
  description: '发送的内容中带有"哈气"时会使耄耋应激',
  priority: 0,
  match: (session) => session.textContent.includes('哈气'),
  handle: async (session) => {
    // 先探一次资源命中，无图直接 return，保持旧行为；命中则链式拼接
    const img = makeResource('bluelock')
    if (!img) return
    return MessageBuilder.message()
      .at(session.userId)
      .text('\n你刚才提到了哈气？\n还有什么比哈气更有意思的事情吗？')
      .append(img)
      .build()
  },
};

// ========== 吃什么命令（保留：依赖 Redis 的状态机） ==========
export const eatCmd: Command = {
  name: '吃什么',
  description: '你要吃什么？',
  match: (session) => {
    const redis = Redis.getInstance()
    const key = `eat-${session.groupId}-${session.raw.sender}`
    if (session.textContent === '吃什么') {
      redis.set(key, true, 3 * 60 * 1000)
      return true
    } else if (session.textContent === '继续') {
      const isExist = redis.get(key)
      if (isExist) {
        redis.set(key, true, 3 * 60 * 60)
        return true
      }
    }
    return false
  },
  handle: () => {
    const foods = []
    while (foods.length < 5) {
      const len = foodArr.length
      const food = foodArr[Math.floor(Math.random() * len)]
      if (!foods.includes(food)) {
        foods.push(food)
      }
    }
    return MessageBuilder.message().text(
      `${foods.map((food, index) => `${index + 1}. ${food}`).join('\n')}
发送继续以继续`,
    ).build()
  },
  priority: 1
}
