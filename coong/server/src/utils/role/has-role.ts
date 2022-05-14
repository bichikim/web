import {toArray} from '@winter-love/utils'
import {AuthArgs} from './types'

export const hasRole = (requiredRole: string) => (args: AuthArgs) => {
  const {session} = args
  const roles = toArray(session.data.roles)
  return roles.includes(requiredRole)
}
