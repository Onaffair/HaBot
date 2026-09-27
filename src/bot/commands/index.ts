import { CommandFactory } from '@/core/command'
import type { Command } from '@/core/command'

import { BGCmd } from './BG'
import { addOneCmd } from './addOne'
import { aiChatCmd } from './aiChat'
import { canvasFlowCmd } from './canvasFlow'
import { haqiCmd } from './haqi2sb'
import { yinjiCmd, eatCmd } from './reactions'
import { videoDownloaderCmd } from './videoLinkDownloader'
import { webScreenshotCmd } from './webScreenshot'
// import { maodieCmd } from './menu' // 菜单命令：暂不启用（沿用原黑名单意图），需要时取消注释并注册

/**
 * 命令显式注册表：新增命令先在实现文件导出定义，再在此列表登记，
 * 未列出的文件不会被加载（取代原目录自动扫描机制）。
 */
const commands: Command[] = [
  BGCmd,
  addOneCmd,
  aiChatCmd,
  canvasFlowCmd,
  haqiCmd,
  yinjiCmd,
  eatCmd,
  videoDownloaderCmd,
  webScreenshotCmd,
]

const fac = CommandFactory.getInstance()
commands.forEach(cmd => fac.registry(cmd))
