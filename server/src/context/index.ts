import {PromiseReturnType} from '@winter-love/utils'
import {withPrisma} from './prisma'
import {createWithHashPassword} from './hash-password'

export const DEFAULT_SALT_FACTOR = 7

const withPasswordHash = createWithHashPassword({
  saltFactor: Number(process.env.PASSWORD_SALT_FACTOR ?? DEFAULT_SALT_FACTOR),
})

export const createContext = withPasswordHash(withPrisma(() => ({})))

export default createContext

export type Context = PromiseReturnType<typeof createContext>
