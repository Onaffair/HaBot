import { Command, CommandFactory } from "@/core/command";
import { makeAtMsg, makeRandomResource, makeTextMsg } from "@/utils/message";
import { createLogger } from "@utils/logger";
import { foodArr } from "@/config";
import { managedResourceService, commandRuleService } from "@/services/db";
import { Redis } from "@/utils/redis";
import type { CommandRule } from "@/services/db/commandRule";

const logger = createLogger('Reactions');

const fac = CommandFactory.getInstance()

// ======================================================================
// 通用匹配逻辑
// ======================================================================

/**
 * 根据触发规则匹配一条消息。
 *   exact    -> 文本完全等于任一关键词
 *   chars    -> 任一关键词的每个字符都出现在文本中（无序包含，兼容"来首歌/不是兄弟"）
 *   contains -> 文本包含任一关键词子串（默认）
 */
function matchRuleText(text: string, rule: CommandRule): boolean {
  const keywords = (rule.keywords || []).filter((k) => k && k.trim())
  if (keywords.length === 0) return false
  switch (rule.matchType) {
    case 'exact':
      return keywords.some((k) => text === k)
    case 'chars':
      return keywords.some((k) => Array.from(k).every((ch) => text.includes(ch)))
    case 'contains':
    default:
      return keywords.some((k) => text.includes(k))
  }
}

// ======================================================================
// 动态注册一：为每个「已启用 且 携带触发关键词」的资源段(目录管理)
// 注册一个"关键词触发随机资源"命令。数据源 managed_resources。
// ======================================================================
function registerResourceReactions(): void {
  void (async () => {
    try {
      const resources = await managedResourceService.findEnabled()
      let count = 0
      for (const r of resources) {
        const keywords = (r.keywords || []).filter((k) => k && k.trim())
        if (keywords.length === 0) continue // 无关键词则无法触发，跳过

        const cmd: Command = {
          name: r.name,
          description: r.description || r.name,
          match: (session) => keywords.some((k) => session.textContent.includes(k)),
          handle: async () => {
            const img = makeRandomResource(r.name);
            if (!img) return;
            logger.info(`[${r.name}] Sending image: ${img.data.file}`);
            return { type: 'message', items: [img] };
          },
        };
        fac.registry(cmd);
        count++
      }
      logger.info(`Dynamic resource reactions registered: ${count} resource(s)`)
    } catch (e) {
      logger.error('Failed to load managed resources for reactions:', e)
    }
  })()
}

// ======================================================================
// 动态注册二：为每个「已启用的触发规则」注册自定义命令。
// 数据源 command_rules（哈个气/音乐/你不是我兄弟等均作为一条规则）。
// ======================================================================
function registerCommandRuleReactions(): void {
  void (async () => {
    try {
      const rules = await commandRuleService.findEnabled()
      let count = 0
      for (const rule of rules) {
        if (!rule.resourceName) continue
        const cmd: Command = {
          name: rule.name,
          description: rule.description || rule.name,
          priority: rule.priority,
          match: (session) => matchRuleText(session.textContent, rule),
          handle: async () => {
            // 若配置了 fileFilter 则定位到目录内特定文件，否则随机取一个
            const item = makeRandomResource(rule.resourceName, rule.fileFilter || undefined);
            if (!item) return;
            logger.info(`[${rule.name}] Sending resource: ${item.data.file}`);
            return { type: 'message', items: [item] };
          },
        };
        fac.registry(cmd);
        count++
      }
      logger.info(`Dynamic command-rule reactions registered: ${count} rule(s)`)
    } catch (e) {
      logger.error('Failed to load command rules for reactions:', e)
    }
  })()
}

// 模块加载时从数据库读取并动态注册
registerResourceReactions()
registerCommandRuleReactions()

// ========== 应激命令（保留：需 @成员 + 文本的复合行为） ==========
const yinjiCmd: Command = {
  name: '应激',
  description: '发送的内容中带有"哈气"时会使耄耋应激',
  priority: 0,
  match: (session) => session.textContent.includes('哈气'),
  handle: async (session) => {
    const img = makeRandomResource('bluelock');
    if (!img) return;
    const sender = session.userId;
    return { type: 'message', items: [makeAtMsg(sender), makeTextMsg('\n你刚才提到了哈气？\n还有什么比哈气更有意思的事情吗？'), img] };
  },
};
fac.registry(yinjiCmd);

// ========== 吃什么命令（保留：依赖 Redis 的状态机） ==========
const eatCmd: Command = {
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
    return {
      type: 'message',
      items: [
        makeTextMsg(
          `${foods.map((food, index) => `${index + 1}. ${food}`).join('\n')}
发送继续以继续`
        )
      ]
    }
  },
  priority: 1
}
fac.registry(eatCmd)
