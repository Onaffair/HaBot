import OneBot from "@/api";
import { concludePersonByAI } from "@/api/ai/llm";
import { Command, CommandFactory } from "@/core/command";
import { GroupUserInfoType } from "@/interface/MessageSendType";
import { makeTextMsg } from "@/utils/message";
import { BeanFactory } from '@/core/bean';
import { createLogger } from "@utils/logger";
import type { GroupConfig } from '@/beans/group';

const factory = BeanFactory.getInstance()
const logger = createLogger('查成分');
const reg = /查一?下(.*)的成分/;

const concludePersonCmd: Command = {
  match: (session) => reg.test(session.textContent),
  name: '查成分',
  handle: async (session) => {
    const match = reg.exec(session.textContent);
    // console.log(match);
    if (!match) return;

    const name = match[1];
    const nameIndex = session.groupMemberNames.findIndex((item) => item === name);

    const group = factory.getBeanValue<GroupConfig>('group')
    const person = group?.listen
      ?.find((item) => item.group_id === String(session.groupId))
      ?.members[nameIndex] as GroupUserInfoType;
    if (!person) return;

    logger.info(`正在查询 ${person.card} 的成分`);
    const resp = await OneBot.getGroupMsgHistory({ group_id: session.groupId, count: 200 }).catch(() => ({ data: { messages: [] } }));
    const { messages } = resp?.data ?? { messages: [] };

    let res = await concludePersonByAI(person, messages);
    if (!res?.trim()) {
      logger.info(`${person.card} 的成分为空`);
      return;
    }
    return { type: 'message', items: [makeTextMsg(res)] };
  },
  description: '查一个人的成分',
}
const fac = CommandFactory.getInstance()
fac.registry(concludePersonCmd)
