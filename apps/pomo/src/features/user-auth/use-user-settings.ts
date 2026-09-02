import {createAsync} from '@solidjs/router'
import {createEffect, createMemo, createSignal, onMount} from 'solid-js'

import {createAuthenticationMachine} from '../auth/machine'
import {clearStoredAppSession, readStoredAppSession, validateAppSession} from './app-session'
import {accountSessionQuery} from './session-query'

export type UserSettingsState =
  | {readonly kind: 'anonymous'}
  | {readonly email: string; readonly kind: 'authenticated'; readonly provider: 'email'}
  | {readonly kind: 'authenticated'; readonly provider: 'toss'}
  | {readonly kind: 'error'}
  | {readonly kind: 'loading'}

const readTossUserSettingsState = async (): Promise<UserSettingsState> => {
  const token = await readStoredAppSession()

  if (token === null) {
    return {kind: 'anonymous'}
  }

  if (await validateAppSession(token)) {
    return {kind: 'authenticated', provider: 'toss'}
  }

  await clearStoredAppSession()
  return {kind: 'anonymous'}
}

export interface UserSettingsController {
  readonly authenticatedEmail: () => string | null
  readonly authenticatedUser: () => Extract<UserSettingsState, {kind: 'authenticated'}> | null
  readonly state: () => UserSettingsState
}

export const useUserSettings = (): UserSettingsController => {
  const authentication = createAuthenticationMachine()
  const isAppsInToss = import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
  const [accountSessionActive, setAccountSessionActive] = createSignal(false)
  const accountSession = createAsync(async () => {
    if (!accountSessionActive() || isAppsInToss) {
      return
    }

    return accountSessionQuery()
  })
  const state = createMemo<UserSettingsState>(() => {
    const currentState = authentication.state()

    switch (currentState.kind) {
      case 'checking':
        return {kind: 'loading'}
      case 'anonymous':
        return currentState
      case 'authenticated':
        return currentState.provider === 'email'
          ? currentState
          : {kind: 'authenticated', provider: 'toss'}
      case 'unavailable':
        return {kind: 'error'}
      default: {
        const unhandledState: never = currentState
        return unhandledState
      }
    }
  })
  const authenticatedUser = createMemo(() => {
    const currentState = state()

    return currentState.kind === 'authenticated' ? currentState : null
  })
  const authenticatedEmail = createMemo(() => {
    const account = authenticatedUser()

    return account?.provider === 'email' ? account.email : null
  })

  createEffect(() => {
    if (!accountSessionActive() || isAppsInToss) {
      return
    }

    try {
      const session = accountSession()

      if (session === undefined) {
        return
      }

      authentication.send(
        session === null
          ? {type: 'resolve-anonymous'}
          : {
              session: {email: session.email, kind: 'authenticated', provider: 'email'},
              type: 'resolve-authenticated',
            },
      )
    } catch {
      authentication.send({type: 'resolve-unavailable'})
    }
  })

  onMount(() => {
    if (!isAppsInToss) {
      setAccountSessionActive(true)
      return
    }

    readTossUserSettingsState()
      .then((resolvedState) => {
        switch (resolvedState.kind) {
          case 'anonymous':
            authentication.send({type: 'resolve-anonymous'})
            return
          case 'authenticated':
            authentication.send({
              session:
                resolvedState.provider === 'email'
                  ? resolvedState
                  : {kind: 'authenticated', provider: 'toss'},
              type: 'resolve-authenticated',
            })
            return
          case 'error':
            authentication.send({type: 'resolve-unavailable'})
            return
          case 'loading':
            authentication.send({type: 'check'})
            return
          default: {
            const unhandledState: never = resolvedState
            return unhandledState
          }
        }
      })
      .catch(() => authentication.send({type: 'resolve-unavailable'}))
  })

  return {
    authenticatedEmail,
    authenticatedUser,
    state,
  }
}
