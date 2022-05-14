import {AuthArgs} from './types'

/**
 * isAdmin < isUser
 * @param args
 */
export const isUser = (args: AuthArgs) => {
  const {session} = args
  return Boolean(session?.itemId)
}
