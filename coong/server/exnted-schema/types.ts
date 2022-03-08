import type WebAuth from '@webauthn-lib/server'
import type {Jwt} from './jwt'

export interface ExtendContext {
  jwt: Jwt
  webAuth: WebAuth
}
