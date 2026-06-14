import { getAITTS } from "@/api/ai/tts";
import { Command, CommandFactory } from "@/core/command";
import { judgeIsAtMe, makeRandomResource, makeVoiceMsg } from "@/utils/message";


const ChatTTS: Command = {
  name: '文本转语音',
  match: (session) => judgeIsAtMe(session) && session.textContent.trim().length > 0,
  handle: async (session) => {
    if (session.textContent.length > 200) {
      return [makeRandomResource('other', '话太多了')]
    }
    const { message } = session
    let audioBuffer = await getAITTS(message)
    // console.log(`TTS Res ${JSON.stringify(res)}`);
    const base64Audio = `base64://${audioBuffer.toString('base64')}`
    return [makeVoiceMsg(base64Audio)]
  },
  description: '@耄耋+文本内容让耄耋模仿守岸人说话',
  priority: 0
}
const fac = CommandFactory.getInstance()
fac.registry(ChatTTS)