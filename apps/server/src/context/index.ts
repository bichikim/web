import {BaseContext, ContextFunction} from '@apollo/server'
import {ExpressContextFunctionArgument} from '@apollo/server/express4'
import {AuthContext, useAuth, UserData} from './auth'
import {HashPasswordContext, preparePasswordBcrypt} from './hash-password'
import {JwtContext, prepareJwt} from './jwt'
import {preparePrisma, PrismaContext} from './prisma'
import {env} from 'src/env'

export {UserData}

export const DEFAULT_SALT_FACTOR = 7

const usePasswordBcrypt = preparePasswordBcrypt({
  saltFactor: env.passwordSaltFactor,
})

const useJwt = prepareJwt({
  key: env.jwtKey,
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
