import { createCommand } from "@/core/command";
import { Session } from "@/interface/session";
import { MessageSendType } from "@/interface/MessageSendType";
import { makeRandomVoice } from "@/utils/message";

export default createCommand({
  name:'哈个气',
  match:(session:Session)=> session.textContent == '哈个气',
  handle :async (session:Session) => { 
    const msg = {} as MessageSendType
    const voiceMsg = makeRandomVoice()
    if (!voiceMsg) return
    msg.group_id = session.groupId.toString()
    msg.message = [voiceMsg]
    console.log('[HaQi] Sending voice:', voiceMsg.data.file);
    const res = await session.sendMessage(msg)
  },
  description:'发送哈个气可以让耄耋语音哈气'
}) 