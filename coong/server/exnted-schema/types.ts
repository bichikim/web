import type WebAuth from '@webauthn-lib/server'

export interface ExtendContext {
  webAuth: WebAuth
}
