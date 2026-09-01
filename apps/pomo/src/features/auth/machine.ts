import {type Accessor, createSignal} from 'solid-js'

interface AnonymousAuthentication {
  readonly kind: 'anonymous'
}

interface AuthenticatedEmailSession {
  readonly email: string
  readonly kind: 'authenticated'
  readonly provider: 'email'
}

interface AuthenticatedTossSession {
  readonly kind: 'authenticated'
  readonly provider: 'toss'
}

interface CheckingAuthentication {
  readonly kind: 'checking'
}

interface UnavailableAuthentication {
  readonly kind: 'unavailable'
}

export type AuthenticatedSession = AuthenticatedEmailSession | AuthenticatedTossSession
export type AuthenticationState =
  | AnonymousAuthentication
  | AuthenticatedSession
  | CheckingAuthentication
  | UnavailableAuthentication

export type AuthenticationEvent =
  | {readonly type: 'check'}
  | {readonly type: 'resolve-anonymous'}
  | {readonly session: AuthenticatedSession; readonly type: 'resolve-authenticated'}
  | {readonly type: 'resolve-unavailable'}
  | {readonly type: 'sign-out'}

export const transitionAuthentication = (
  state: AuthenticationState,
  event: AuthenticationEvent,
): AuthenticationState => {
  switch (event.type) {
    case 'check':
      return {kind: 'checking'}
    case 'resolve-anonymous':
      return {kind: 'anonymous'}
    case 'resolve-authenticated':
      return event.session
    case 'resolve-unavailable':
      return {kind: 'unavailable'}
    case 'sign-out':
      return state.kind === 'authenticated' ? {kind: 'anonymous'} : state
    /* v8 ignore next 3 -- TypeScript prevents events outside the exhaustive union. */
    default: {
      const unhandledEvent: never = event
      return unhandledEvent
    }
  }
}

export interface AuthenticationMachine {
  readonly send: (event: AuthenticationEvent) => void
  readonly state: Accessor<AuthenticationState>
}

export const createAuthenticationMachine = (
  initialState: AuthenticationState = {kind: 'checking'},
): AuthenticationMachine => {
  const [state, setState] = createSignal(initialState)

  return {
    send: (event) => setState((state) => transitionAuthentication(state, event)),
    state,
  }
}
