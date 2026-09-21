import { Command } from "@/core/command";
import { MessageBuilder, makeResource } from "@/utils/message";
import { createLogger } from "@utils/logger";
import { foodArr } from "@/config";
import { Redis } from "@/utils/redis";

const logger = createLogger('Reactions');

// ======================================================================
// 动态注册说明：
//  - 资源段命令（managed_resources）：由 beans/resource 初始化时经
//    core/runtime.applyResources() 注册。
//  - 触发规则命令（command_rules）：由单进程入口 src/index.ts 调用
//    core/runtime.applyRules() 注册。
//  bot 与后端同进程，运行期后端改库后直接调用 core/runtime（runtime.upsertResource
//  / upsertRule / refreshGroups / rescanUnderPath）同步命令与数据，无跨进程通知。
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
