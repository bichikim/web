import type WebAuth from '@webauthn-lib/server'
import type {JwtContext} from './jwt'
import type {Blockchain} from './blockchain'

export interface ExtendContext {
  blockchain: Blockchain
  jwt: JwtContext
  webAuth: WebAuth
}
