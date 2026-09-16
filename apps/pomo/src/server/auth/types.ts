export type AuthAccess = 'admin' | 'anonymous' | 'invalid' | 'user'

interface SessionAccess {
  readonly access: AuthAccess
  readonly setCookies: ReadonlyArray<string>
}

export interface NeonIdentity {
  readonly email: string
  readonly id: string
}

export interface NeonSession extends SessionAccess {
  readonly provider: 'neon'
  readonly identity: NeonIdentity | null
}

export interface TossSession extends SessionAccess {
  readonly provider: 'toss'
  readonly userId: string | null
}

export type AuthSessionResult = NeonSession | TossSession

export interface RequestAuthentication {
  neonResult?: Promise<NeonSession>
  readonly request: Request
  tossResult?: Promise<TossSession>
}
