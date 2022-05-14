import {AuthArgs} from './types'

export const isAdmin = (args: AuthArgs) => {
  const {session} = args
  return Boolean(session?.data?.isAdmin)
}
