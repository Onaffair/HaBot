import config from "@/bot.config";
import { Session } from "@/core/session";
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
export async function chatWithAI(session: Session) {
  const body = JSON.parse(JSON.stringify(ai.body))
  const groupMembers = config.group.listen
    .find(item => item.group_id == session.raw.group_id.toString())
    ?.members?.map(item => {
      if (item?.card?.trim() !== '') {
        return item?.card
      } else {
        return item?.nickname
      }
    })

  const prompt = ai.getPrompt(groupMembers)
  body.messages.push(prompt)
  const userMsg = {
    role: 'user',
    content: JSON.stringify(session.raw.message)
  }
  body.messages.push(userMsg)
  try {
    const res = await sendAImessage(body)

    return res
  } catch (e) {
    console.log("err", e?.message);
  }
}



