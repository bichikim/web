import {AuthArgs} from './types'

export const isUser = (args: AuthArgs) => {
  const {session} = args
  return Boolean(session?.itemId)
}
