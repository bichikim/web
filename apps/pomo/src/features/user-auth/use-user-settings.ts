import {createMemo} from 'solid-js'

import {useAuth} from '../auth/AuthProvider'

interface AnonymousUserSettings {
  readonly kind: 'anonymous'
}

interface EmailUserSettings {
  readonly email: string
  readonly kind: 'authenticated'
  readonly provider: 'email'
}

interface TossUserSettings {
  readonly kind: 'authenticated'
  readonly provider: 'toss'
}

interface ErrorUserSettings {
  readonly kind: 'error'
}

interface LoadingUserSettings {
  readonly kind: 'loading'
}

export type AuthenticatedUserSettings = EmailUserSettings | TossUserSettings
export type UserSettingsState =
  | AnonymousUserSettings
  | AuthenticatedUserSettings
  | ErrorUserSettings
  | LoadingUserSettings

export interface UserSettingsController {
  readonly authenticatedEmail: () => string | null
  readonly authenticatedUser: () => AuthenticatedUserSettings | null
  readonly state: () => UserSettingsState
}

export const useUserSettings = (): UserSettingsController => {
  const authentication = useAuth()
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

  return {
    authenticatedEmail,
    authenticatedUser,
    state,
  }
}
