import {revalidate} from '@solidjs/router'
import {createContext, type JSX, onCleanup, onMount, useContext} from 'solid-js'
import {subscribeWebSessionUnauthorized} from '../http-client'

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
  onMount(() => {
    if (isAppsInToss) {
      return
    }

    let checkingSession = false
    const finishCheck = () => {
      checkingSession = false
    }
    const unsubscribe = subscribeWebSessionUnauthorized(() => {
      if (checkingSession || controller.session() === null) {
        return
      }

      checkingSession = true
      const invalidation = revalidate(accountSessionQuery.key)
      Promise.allSettled([invalidation, accountSessionQuery()]).then(finishCheck)
    })
    onCleanup(unsubscribe)
  })

  return <AuthContext.Provider value={controller}>{props.children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
