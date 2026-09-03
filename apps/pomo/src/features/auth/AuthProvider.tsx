import {createAsync} from '@solidjs/router'
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onMount,
  useContext,
} from 'solid-js'

import {accountSessionQuery, tossSessionQuery} from '../user-auth/session-query'
import {
  type AuthenticatedSession,
  type AuthenticationState,
  createAuthenticationMachine,
} from './machine'

export interface AuthController {
  readonly authenticatedEmail: () => string | null
  readonly session: () => AuthenticatedSession | null
  readonly state: () => AuthenticationState
}

export interface AuthProviderProps {
  readonly children?: JSX.Element
}

const AuthContext = createContext<AuthController>()

export const AuthProvider = (props: AuthProviderProps) => {
  const authentication = createAuthenticationMachine()
  const isAppsInToss = import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
  const [sessionActive, setSessionActive] = createSignal(false)
  const resolvedSession = createAsync(
    async (): Promise<AuthenticatedSession | null | undefined> => {
      if (!sessionActive()) {
        return
      }

      if (isAppsInToss) {
        return (await tossSessionQuery()) ? {kind: 'authenticated', provider: 'toss'} : null
      }

      const accountSession = await accountSessionQuery()
      return accountSession === null
        ? null
        : {email: accountSession.email, kind: 'authenticated', provider: 'email'}
    },
  )
  const session = createMemo<AuthenticatedSession | null>(() => {
    const state = authentication.state()
    return state.kind === 'authenticated' ? state : null
  })
  const authenticatedEmail = createMemo(() => {
    const currentSession = session()
    return currentSession?.provider === 'email' ? currentSession.email : null
  })
  const controller: AuthController = {
    authenticatedEmail,
    session,
    state: authentication.state,
  }

  createEffect(() => {
    if (!sessionActive()) {
      return
    }

    try {
      const currentSession = resolvedSession()

      if (currentSession === undefined) {
        return
      }

      authentication.send(
        currentSession === null
          ? {type: 'resolve-anonymous'}
          : {session: currentSession, type: 'resolve-authenticated'},
      )
    } catch {
      authentication.send({type: 'resolve-unavailable'})
    }
  })

  onMount(() => setSessionActive(true))

  return <AuthContext.Provider value={controller}>{props.children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
