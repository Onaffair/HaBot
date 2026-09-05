import { Command, CommandFactory } from "@/core/command";
import { createLogger } from "@/utils/logger";
import { makeTextMsg } from "@/utils/message";
import { PlaywrightManager } from "@/utils/playwright";
import { MessageItem } from "@/interface/onebot";
import { isBlockedUrl } from "@/utils/webShotBlacklist";

const logger = createLogger('webScreenshot')

/**
 * URL 匹配：http/https 开头，
 * 以空白、引号、括号及常见中文标点作为 URL 边界（避免把句尾标点截进 URL）。
 * 注意：不加 /g 标志，避免 lastIndex 状态导致 test() 交替返回 false。
 */
const URL_PATTERN = /https?:\/\/[^\s<>"'（）【】《》，。！？；：、]+/i;

const webScreenshotCmd: Command = {
  name: '网页截图',
  description: '消息中包含网页链接时，自动截取网页并回复图片',
  priority: 0,
  match: (session) => URL_PATTERN.test(session.textContent),
  handle: async (session) => {
    const url = session.textContent.match(URL_PATTERN)?.[0]
    if (!url) return

    // 命中黑名单域名的链接不截图
    const block = isBlockedUrl(url)
    if (block.blocked) {
      logger.info(`blocked url, domain in blacklist: ${url} (rule: ${block.matched})`)
      return {
        type: 'message',
        items: [makeTextMsg(`该域名（${block.matched}）已被屏蔽，不予截图。`)]
      }
    }

    logger.info(`start screenshot: ${url}`)
    try {
      const pm = PlaywrightManager.getInstance()
      const buffer = await pm.screenshot(url)
      logger.info(`screenshot done: ${url} (${buffer.length} bytes)`)

      const imageItem: MessageItem = {
        type: 'image',
        data: { file: `base64://${buffer.toString('base64')}` }
      }
      return { type: 'message', items: [imageItem] }
    } catch (e: any) {
      logger.error(`screenshot failed: ${url}`, e)
      return {
        type: 'message',
        items: [makeTextMsg(`网页截图失败：${e?.message || '未知错误'}`)]
      }
    }
  },
}

CommandFactory.getInstance().registry(webScreenshotCmd)
