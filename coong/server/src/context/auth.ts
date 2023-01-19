import {ExpressContext} from './types'
export interface UserData {
  email: string
  id: string
  roles?: string[]
}

export interface AuthContext {
  roles?: string[]
  token?: string
  user?: UserData
}

const bearerRegex = /^Bearer /u

export const unwrapBearerToken = (token?: string) => {
  if (!token) {
    return
  }

  if (!bearerRegex.test(token)) {
    return
  }

  return token.replace(bearerRegex, '')
}

export const useAuth = (expressContext: ExpressContext): AuthContext => {
  const {req} = expressContext

  const {
    headers: {authorization},
  } = req

  const token = Array.isArray(authorization) ? authorization.join('') : authorization

  return {
    token: unwrapBearerToken(token),
    user: undefined,
  }
}
