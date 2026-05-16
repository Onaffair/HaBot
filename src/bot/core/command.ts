import { Session } from '../interface/session'
import { MessageItemType } from '../interface/MessageSendType'

export interface Command {
  name: string,
  match: (session: Session) => boolean | Promise<boolean>,
  handle: (session: Session) => MessageItemType[] | undefined | Promise<MessageItemType[] | undefined>;
  description?: string,
  priority?: number,
  ext?: any,
}
export const createCommand = (cmd: Command) => cmd
