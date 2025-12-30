import { Session } from '../interface/session'

export interface Command {
  name: string
  match: (session: Session) => boolean
  handle: (session: Session) => void | Promise<void>
  description?: string,
  ext?: any
}
export const createCommand = (cmd: Command) => cmd
