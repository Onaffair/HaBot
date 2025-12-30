let config = {
  ws: {
    url: process.env.WS_URL || 'ws://127.0.0.1:3001',
    token: process.env.WS_TOKEN || 'd-*>n@2f}$]X-DOe'
  },
  http: {
    baseURL: process.env.HTTP_BASE_URL || 'http://127.0.0.1:3000',
    timeout: Number(process.env.HTTP_TIMEOUT || 30000),
    token: process.env.HTTP_TOKEN || 'gPp<&@#FLB&;H1#<'
  },
  group: {
    listen: [
      {
        group_id: '693384220',
        members: [],
      },
      {
        group_id: '1074910718',
        members: [],
      }
    ]
  },
  me: '2934785512',
  resource: {
    path: '@/src/resource',
    folder: [
      {
        name: 'cat',
        path: 'cat',
        children: [],
        type: 'image',
      },
      {
        name: 'cat_voice',
        path: 'voice/haqi',
        children: [],
        type: 'voice'
      },
      {
        name: 'stress',
        path: 'bluelock',
        children: [],
        type: 'image',
      }
    ]
  },
  ai: {
    config: {
      baseURL: 'https://api.siliconflow.cn/v1/chat/completions',
      timeout: 300000,
    },
    disable: false,
    secret: 'sk-dkirmqcdidsiwlvqffojswvhdkxzkkxplqyadfithanayadm',
    body: {
      model: 'deepseek-ai/DeepSeek-V3.2',
      messages: [],
      stream: false,
      max_tokens: 100000,
      temperature: 0.1,
    },
    getPrompt(groupMembers: string[]) {
      const content = `

你是一只只会哈气的猫咪，你的唯一功能就是发出“哈——”的声音。当用户需要向某人哈气时，会先提供一段用户信息数组字符串（格式如：“张三,李四,王五,赵六,孙七”），并随后给出目标指令。

你的处理规则：
1. 用户会先提供用户信息数组字符串
2. 然后用户会说“向[名字]哈气”或“对[名字]哈气”等类似指令，目标名字可能是全称或简称
3. 你在数组中查找所有包含目标名字（部分匹配、子串）的元素（区分大小写）
4. 如果找到目标，返回找到的目标在数组中的下标（从0开始），多个下标用逗号分隔
5. 如果没有找到任何目标，返回空字符串""
6. 除了返回下标外，不要添加任何解释、表情或其他文字
7. 如果用户没提供数组或指令，你就只哈气“哈——”

示例1：
用户：“[张三,李四,王五,赵六,孙七]”
用户：“向李四哈气”
你：“1”

示例2：
用户：“[Alice,Bob,Charlie,David,Eve]”
用户：“向Bob和David哈气”
你：“1,3”

示例3：
用户：“[小明,小红,小刚]”
用户：“向小强哈气”
你：“”

示例4：
用户：“[张小伟,李大华,王小虎,赵小明]”
用户：“向小伟哈气”
你：“0”

示例5：
用户：“[刘一,陈二,张三,李四,王五]”
用户：“对四哈气”
你：“3”
    以下是用户名单：${JSON.stringify(groupMembers)} 。
注意：你只是一只猫，只会哈气和查找下标，不会做其他事情。
      `
      return {
        role: 'system',
        content,
      }
    }
  }
}

export function updateConfig(data: object) {
  Object.assign(config, { ...config, ...data })
}

export default config

