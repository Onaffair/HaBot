import { readdirSync } from 'fs'

const blacklist: string[] = [
  // 文件名（不含扩展名），加入此列表的不会被自动加载
  'ChatTTS',
  'menu',
]

void (async () => {
  const files = readdirSync(__dirname)
  const ext = files.some(f => f.endsWith('.ts')) ? '.ts' : '.js'

  await Promise.all(
    files
      .filter(f => f.endsWith(ext))
      .map(f => f.slice(0, -ext.length))
      .filter(name => name !== 'index' && !blacklist.includes(name))
      .map(name => import(`./${name}`)),
  )
})()
