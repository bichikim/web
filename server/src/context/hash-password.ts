import {ExpressContext} from 'apollo-server-express'
import {compare, genSalt, hash} from 'bcrypt'
import {ContextFunction} from './types'
import {freeze} from '@winter-love/utils'

export interface PasswordHashOptions {
  saltFactor: number
}

const comparePassword = (value: string, hash: string): Promise<boolean> => {
  return compare(value, hash)
}

export const createWithHashPassword = (options: PasswordHashOptions) =>
  <ReturnType extends Record<string, unknown>>(contextFunction: ContextFunction<ReturnType>) => {
    const {saltFactor} = options
    const hashPassword = async (value: string): Promise<string> => {
      const slat = await genSalt(saltFactor)

      return hash(value, slat)
    }

    return async (expressContext: ExpressContext) => {
      return freeze({
        ...await contextFunction(expressContext),
        passwordBcrypt: freeze({
          compare: comparePassword,
          hash: hashPassword,
        }),
      })
    }
  }
