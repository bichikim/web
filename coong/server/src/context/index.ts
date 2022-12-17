import {BaseContext, ContextFunction} from '@apollo/server'
import {ExpressContextFunctionArgument} from '@apollo/server/express4'
import {AuthContext, useAuth, UserData} from './auth'
import {HashPasswordContext, preparePasswordBcrypt} from './hash-password'
import {JwtContext, prepareJwt} from './jwt'
import {preparePrisma, PrismaContext} from './prisma'
// import {ContextFunction} from './types'

export {UserData}

export const DEFAULT_SALT_FACTOR = 7

const usePasswordBcrypt = preparePasswordBcrypt({
  saltFactor: Number(process.env.PASSWORD_SALT_FACTOR ?? DEFAULT_SALT_FACTOR),
})

const useJwt = prepareJwt({
  key: process.env.JWT_KEY,
})

const usePrisma = preparePrisma()

export interface Context extends BaseContext {
  auth: AuthContext
  jwt: JwtContext
  passwordBcrypt: HashPasswordContext
  prisma: PrismaContext
}

const context: ContextFunction<[ExpressContextFunctionArgument], Context> = async (
  expressContext,
) => {
  const auth = useAuth(expressContext)
  const jwt = useJwt()
  const passwordBcrypt = usePasswordBcrypt()
  const prisma = usePrisma()

  return {
    auth,
    jwt,
    passwordBcrypt,
    prisma,
  }
}

export default context
