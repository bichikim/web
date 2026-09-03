import {createAsync} from '@solidjs/router'
import {createEffect, createMemo, createSignal, onMount} from 'solid-js'

import {
  type AuthenticatedSession,
  type AuthenticationState,
  createAuthenticationMachine,
} from './machine'

export interface AuthController {
  readonly session: () => AuthenticatedSession | null
  readonly state: () => AuthenticationState
}

export interface AuthenticationControllerOptions {
  readonly loadSession: () => Promise<AuthenticatedSession | null>
}

export const createAuthenticationController = (
  options: AuthenticationControllerOptions,
): AuthController => {
  const authentication = createAuthenticationMachine()
  const [sessionActive, setSessionActive] = createSignal(false)
  const resolvedSession = createAsync(
    async (): Promise<AuthenticatedSession | null | undefined> => {
      if (!sessionActive()) {
        return
      }

      return options.loadSession()
    },
  )
  const session = createMemo<AuthenticatedSession | null>(() => {
    const state = authentication.state()
    return state.kind === 'authenticated' ? state : null
  })

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

  return {
    session,
    state: authentication.state,
  }
}
