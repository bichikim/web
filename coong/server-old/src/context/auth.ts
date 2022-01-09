import {ExpressContext} from 'apollo-server-express'
import {ContextFunction} from './types'

export interface SelfUserData {
  email: string
  id: string
}

export interface AuthContext {
  isSelf: boolean
  self?: SelfUserData
  token?: string
}

export const unwrapBearerToken = (token?: string) => {
  return token ? token.replace(/^Bearer /u, '') : token
}

export const withAuth = <ReturnType extends Record<string, unknown>>(
  contextFunction: ContextFunction<ReturnType>,
) => {

  return async (expressContext: ExpressContext) => {
    const {
      req,
    } = expressContext

    const {headers: {authorization}} = req

    const token = (Array.isArray(authorization) ? authorization.join('') : authorization)

    const auth: AuthContext = {
      isSelf: false,
      self: undefined,
      token: unwrapBearerToken(token),
    }

    return Object.freeze({
      ...await contextFunction(expressContext),
      auth,
    })
  }
}