const DEFAULT_PORT = 8080
import {config} from 'dotenv'
config()

const DEFAULT_SALT_FACTOR = 7
export const env = {
  get jwtKey() {
    return process.env.JWT_KEY
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'production'
  },
  get optionCache() {
    return process.env.OPTION_CACHE === 'true'
  },
  get passwordSaltFactor() {
    return Number(process.env.PASSWORD_SALT_FACTOR ?? DEFAULT_SALT_FACTOR)
  },
  get port() {
    return Number(process.env.PORT ?? DEFAULT_PORT)
  },
}
