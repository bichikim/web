import {PromiseReturnType} from '@winter-love/utils'
import {withPrisma} from './prisma'
import {createWithHashPassword} from './hash-password'
import {withAuth} from './auth'
import {createWithJwt} from './jwt'

export const DEFAULT_SALT_FACTOR = 7
export const DEFAULT_JWT_KEY = 'my-unknown-key'

const withPasswordHash = createWithHashPassword({
  saltFactor: Number(process.env.PASSWORD_SALT_FACTOR ?? DEFAULT_SALT_FACTOR),
})

const withJwt = createWithJwt({
  key: process.env.JWT_KEY ?? DEFAULT_JWT_KEY,
})

export const createContext = withAuth(withJwt(withPasswordHash(withPrisma(() => ({})))))

export default createContext

export type Context = PromiseReturnType<typeof createContext>
