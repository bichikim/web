import {ExpressContext} from 'apollo-server-express'
import {compare, genSalt, hash} from 'bcrypt'
import {ContextFunction} from './types'
import {freeze} from '@winter-love/utils'

export interface AuthContext {
  checkAuthorId?: string
}

export const withAuth = <ReturnType extends Record<string, unknown>>(
  contextFunction: ContextFunction<ReturnType>,
) => {

  return async (expressContext: ExpressContext) => {
    const auth: AuthContext = {
      checkAuthorId: undefined
    }
    
    return freeze({
      ...await contextFunction(expressContext),
      auth,
    })
  }
}
