import { Session } from './session'

export interface Command {
  name: string
  match: (session: Session) => boolean
  handle: (session: Session) => void | Promise<void>
  description?: string
}
export const createCommand = (cmd: Command) => cmd
