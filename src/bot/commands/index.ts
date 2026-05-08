import fs from 'fs'
import path from 'path'
import { Command } from '@/core/command'

const commands: Command[] = []
const files = fs.readdirSync(__dirname)

files.forEach((file) => {
  // 排除当前文件、非 ts/js 文件以及类型定义文件
  if (file === 'index.ts' || file === 'index.js' || file.endsWith('.d.ts')) return
  try {
    // 动态引入模块
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(path.join(__dirname, file))

    // 获取默认导出
    const cmd = module.default

    if (cmd) {
      if (Array.isArray(cmd)) {
        commands.push(...cmd)
      } else {
        commands.push(cmd)
      }
    }
  } catch (e) {
    console.log("err", e);

  }
})
commands.sort((a, b) => a.priority - b.priority)

export default commands
