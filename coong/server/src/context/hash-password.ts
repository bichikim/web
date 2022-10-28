import {compare, genSalt, hash} from 'bcryptjs'

export interface PasswordHashOptions {
  saltFactor: number
}

export interface HashPasswordContext {
  compare: (value: string, hash: string) => Promise<boolean>
  hash: (value: string) => Promise<string>
}

const comparePassword = (value: string, hash: string): Promise<boolean> => {
  return compare(value, hash)
}

export const preparePasswordBcrypt = (
  options: PasswordHashOptions,
): (() => HashPasswordContext) => {
  const {saltFactor} = options
  const hashPassword = async (value: string): Promise<string> => {
    const slat = await genSalt(saltFactor)

    return hash(value, slat)
  }
  return () => ({
    compare: comparePassword,
    hash: hashPassword,
  })
}
