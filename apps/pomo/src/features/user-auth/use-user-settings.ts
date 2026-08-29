import {createMemo, createSignal, onMount} from 'solid-js'

import {clearStoredAppSession, readStoredAppSession, validateAppSession} from './app-session'
import {readAccountSession} from './web-session'

export type UserSettingsState =
  | {readonly kind: 'anonymous'}
  | {readonly email: string; readonly kind: 'authenticated'; readonly provider: 'email'}
  | {readonly kind: 'authenticated'; readonly provider: 'toss'}
  | {readonly kind: 'error'}
  | {readonly kind: 'loading'}

const readUserSettingsState = async (): Promise<UserSettingsState> => {
  if (!(import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true')) {
    const session = await readAccountSession()

    return session === null
      ? {kind: 'anonymous'}
      : {email: session.email, kind: 'authenticated', provider: 'email'}
  }

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
  const [state, setState] = createSignal<UserSettingsState>({kind: 'loading'})
  const authenticatedUser = createMemo(() => {
    const currentState = state()

    return currentState.kind === 'authenticated' ? currentState : null
  })
  const authenticatedEmail = createMemo(() => {
    const account = authenticatedUser()

    return account?.provider === 'email' ? account.email : null
  })

  onMount(() => {
    readUserSettingsState()
      .then(setState)
      .catch(() => setState({kind: 'error'}))
  })

  return {
    authenticatedEmail,
    authenticatedUser,
    state,
  }
}
