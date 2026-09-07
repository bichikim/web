import {createContext, type JSX, useContext} from 'solid-js'

import {accountSessionQuery, tossSessionQuery} from '../user-auth/session-query'
import {type AuthController, createAuthenticationController} from './controller'
import type {AuthenticatedSession} from './machine'

export interface AuthProviderProps {
  readonly children?: JSX.Element
}

const AuthContext = createContext<AuthController>()

export const AuthProvider = (props: AuthProviderProps) => {
  const isAppsInToss = import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
  const loadSession = async (): Promise<AuthenticatedSession | null> => {
    if (isAppsInToss) {
      return (await tossSessionQuery()) ? {kind: 'authenticated', provider: 'toss'} : null
    }

    const accountSession = await accountSessionQuery()
    return accountSession === null
      ? null
      : {email: accountSession.email, kind: 'authenticated', provider: 'email'}
  }
  const controller = createAuthenticationController({loadSession})

  return <AuthContext.Provider value={controller}>{props.children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
