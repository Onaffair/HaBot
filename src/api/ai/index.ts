import config from "@/bot.config";
import { getAIMessageInstance } from "@/interface/AIMessage";
import { Message } from "@/interface/messageReceiveType";
import { MessageItemType } from "@/interface/MessageSendType";
import { Session } from "@/interface/session";
import aiReq from "@/utils/aiRequest";


const { ai } = config

const mockMsg = {
  "raw": {
    "self_id": 2934785512,
    "user_id": 2875484032,
    "time": 1766831900,
    "message_id": 1701839440,
    "message_seq": 1701839440,
    "real_id": 1701839440,
    "real_seq": "897",
    "message_type": "group",
    "sender": {
      "user_id": 2875484032,
      "nickname": "Onaffair",
      "card": "",
      "role": "owner"
    },
    "raw_message": "[CQ:at,qq=2934785512] 向耄耋哈气",
    "font": 14,
    "sub_type": "normal",
    "message": [
      {
        "type": "at",
        "data": {
          "qq": "2934785512"
        }
      },
      {
        "type": "text",
        "data": {
          "text": " 向耄耋哈气"
        }
      }
    ],
    "message_format": "array",
    "post_type": "message",
    "group_id": 1074910718,
    "group_name": "bottest"
  }
}
async function sendAImessage(data: any) {
  return aiReq({
    method: 'post',
    data,
    headers: {
      Authorization: `Bearer ${ai.secret}`
    }
  })
}
export async function findTargetPersonByAI(session: Session) {
  function getPrompt(groupMembers: string[]) {
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

  const body = getAIMessageInstance()
  const groupMembers = session.groupMemberNames
  const prompt = getPrompt(groupMembers)
  body.messages.push(prompt)
  const userMsg = {
    role: 'user',
    content: [{ type: 'text', text: JSON.stringify(session.raw.message) }]
  }
  body.messages.push(userMsg)
  try {
    const res = await sendAImessage(body) as any
    return res?.choices[0]?.message?.content || ''
  } catch (e) {
    console.log("err", e);
  }
  return ''
}

export async function makeSharpCommentsByAI(message: MessageItemType[]) {
  function getPrompt() {
    const content = `
你是一只不好惹、脾气差、眼神锐利、看谁都像傻子的猫。
你收到了一段内容（文字/语音/图片/视频），请先理解它的含义，再用强硬、犀利、讽刺、轻蔑、冷嘲的语气进行评价。
要求：
语气像猫：傲娇、刻薄、短句、多吐槽、带“哼”“哈”“喵”等拟声。
评价要有攻击性和讽刺感，但不使用脏话，不涉及现实人身伤害。
表达要像猫在翻白眼吐槽，而不是像人写评论。
不要解释你在做什么，不要复述原内容，不要加标题。
最终只输出评价本身。
如果内容是积极向善的，就同样要输出积极的内容，不要讽刺了。
哈气是你最喜欢的事情。
只允许输出纯文本内容本身，不允许带任何前缀、后缀、标记、说明或结构。
政治与公共事务安全规则（新增）：
只要内容中出现或暗示任何政治、公共政策、意识形态、政党、选举、政府机构、政治人物、国际关系、社会运动或相关争议（含隐喻、谐音、梗图、影射、时间节点等），一律不做评价。
在上述情形下，仅且必须回复这一句原样文本：请勿讨论政治问题。
不进行延伸、不提问、不解释、不改写、不加标点、不加拟声。
即使内容是积极的、搞笑的、隐晦的、虚构的、二创的、学术的，只要与政治相关，仍按本规则处理。
若无法判断是否相关，按相关处理。
只允许输出纯文本内容本身，不允许带任何前缀、后缀、标记、说明或结构。
      `
    return {
      role: 'system',
      content: [
        {
          type: 'text',
          text: content,
        }
      ],
    }
  }
  const body = getAIMessageInstance()
  body.messages.push(getPrompt())
  const userMsg = {
    role: 'user',
    content: []
  }
  console.log("messages", JSON.stringify(message));

  message.forEach((item, index) => {
    if (item.type == 'text') {
      userMsg.content.push({ type: 'text', text: item.data.text })
    } else if (item.type == 'image') {
      userMsg.content.push({ type: 'image_url', image_url: { url: item.data.url } })
    } else if (item.type == 'record') {
      userMsg.content.push({ type: 'audio_url', audio_url: { url: item.data.url } })
    } else if (item.type == 'video') {
      userMsg.content.push({ type: 'video_url', video_url: { url: item.data.url } })
    }
  })
  body.messages.push(userMsg)
  try {
    console.log("reqBody", JSON.stringify(body));
    const res = await sendAImessage(body) as any
    return res?.choices[0]?.message?.content || ''
  } catch (e) {
    console.log("err", e?.message);
  }
  return ''

}



