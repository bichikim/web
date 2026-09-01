import {useSubmission} from '@solidjs/router'
import {createEffect, createMemo, createSignal, onMount} from 'solid-js'

import * as m from '@paraglide/message'

import {
  type MagicLinkActionResult,
  requestAccountMagicLinkAction,
  signOutAccountSessionAction,
  type SignOutActionResult,
} from '../auth/actions'
import {createAuthenticationMachine} from '../auth/machine'
import {type AccountSession, completeAccountLink, readAccountSession} from './web-session'

export interface WebAccountController {
  readonly email: () => string
  readonly errorMessage: () => string | null
  readonly isLoading: () => boolean
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly session: () => AccountSession | null
  readonly successMessage: () => string | null
}

export const useWebAccount = (): WebAccountController => {
  const authentication = createAuthenticationMachine()
  const magicLinkSubmission = useSubmission(requestAccountMagicLinkAction)
  const signOutSubmission = useSubmission(signOutAccountSessionAction)
  const [email, setEmail] = createSignal('')
  const [localErrorMessage, setLocalErrorMessage] = createSignal<string | null>(null)
  const [localSuccessMessage, setLocalSuccessMessage] = createSignal<string | null>(null)
  const [magicLinkStatus, setMagicLinkStatus] = createSignal<
    MagicLinkActionResult['status'] | null
  >(null)
  const [signOutStatus, setSignOutStatus] = createSignal<SignOutActionResult['status'] | null>(null)
  const session = createMemo<AccountSession | null>(() => {
    const state = authentication.state()

    return state.kind === 'authenticated' && state.provider === 'email'
      ? {email: state.email}
      : null
  })
  const errorMessage = createMemo(() => {
    const magicLinkResultStatus = magicLinkStatus()
    const signOutResultStatus = signOutStatus()

    if (magicLinkResultStatus === 'rejected') {
      return m.web_account_magic_link_failed()
    }

    if (magicLinkResultStatus === 'unavailable') {
      return m.web_account_server_failed()
    }

    if (signOutResultStatus === 'rejected' || signOutResultStatus === 'unavailable') {
      return m.web_account_sign_out_failed()
    }

    return localErrorMessage()
  })
  const successMessage = createMemo(() =>
    magicLinkStatus() === 'sent' ? m.web_account_magic_link_sent() : localSuccessMessage(),
  )

  onMount(() => {
    let accountCallbackErrorMessage: string | null = null

    const loadAccount = async () => {
      const url = new URL(window.location.href)
      const linkError = url.searchParams.get('link_error')
      const linkToken = url.searchParams.get('link_token')

      if (linkToken !== null) {
        const linkResult = await completeAccountLink(linkToken)
        url.searchParams.delete('link_token')

        if (linkError === 'email') {
          url.searchParams.delete('link_error')
        }

        window.history.replaceState(null, '', url)

        if (linkResult === 'linked') {
          setLocalSuccessMessage(m.web_account_linked())
        } else {
          accountCallbackErrorMessage = m.web_account_link_expired()
          setLocalErrorMessage(accountCallbackErrorMessage)
        }
      } else if (linkError === 'email') {
        url.searchParams.delete('link_error')
        accountCallbackErrorMessage = m.web_account_link_invalid()
        setLocalErrorMessage(accountCallbackErrorMessage)
      }

      window.history.replaceState(null, '', url)
      const resolvedSession = await readAccountSession()

      authentication.send(
        resolvedSession === null
          ? {type: 'resolve-anonymous'}
          : {
              session: {
                email: resolvedSession.email,
                kind: 'authenticated',
                provider: 'email',
              },
              type: 'resolve-authenticated',
            },
      )
    }

    loadAccount().catch(() => {
      setLocalSuccessMessage(null)

      if (accountCallbackErrorMessage === null) {
        setLocalErrorMessage(m.web_account_load_failed())
      }

      authentication.send({type: 'resolve-unavailable'})
    })
  })

  createEffect(() => {
    if (magicLinkSubmission.pending === true) {
      setMagicLinkStatus(null)
      return
    }

    const {result} = magicLinkSubmission

    if (result === undefined) {
      return
    }

    setMagicLinkStatus(result.status)
    magicLinkSubmission.clear()
  })

  createEffect(() => {
    if (signOutSubmission.pending === true) {
      setSignOutStatus(null)
      return
    }

    const {result} = signOutSubmission

    if (result === undefined) {
      return
    }

    setSignOutStatus(result.status)
    signOutSubmission.clear()

    if (result.status !== 'signed-out') {
      return
    }

    authentication.send({type: 'sign-out'})
    setLocalErrorMessage(null)
    setLocalSuccessMessage(m.web_account_signed_out())
  })

  return {
    email,
    errorMessage,
    isLoading: () => authentication.state().kind === 'checking',
    isSubmitting: () => magicLinkSubmission.pending === true || signOutSubmission.pending === true,
    onEmailChange: setEmail,
    session,
    successMessage,
  }
}
