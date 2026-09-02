import {createAsync, useAction, useSubmission} from '@solidjs/router'
import {createEffect, createMemo, createSignal, onMount} from 'solid-js'

import * as m from '@paraglide/message'

import {
  type MagicLinkActionResult,
  requestAccountMagicLinkAction,
  signOutAccountSessionAction,
  type SignOutActionResult,
} from '../auth/actions'
import {createAuthenticationMachine} from '../auth/machine'
import {completeAccountLinkAction} from './actions'
import {accountSessionQuery} from './session-query'
import type {AccountSession} from './web-session'

export interface WebAccountController {
  readonly email: () => string
  readonly errorMessage: () => string | null
  readonly isLoading: () => boolean
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly session: () => AccountSession | null
  readonly successMessage: () => string | null
}

const getAccountSessionResolution = (resolvedSession: AccountSession | null) =>
  resolvedSession === null
    ? ({type: 'resolve-anonymous'} as const)
    : ({
        session: {
          email: resolvedSession.email,
          kind: 'authenticated',
          provider: 'email',
        },
        type: 'resolve-authenticated',
      } as const)

export const useWebAccount = (): WebAccountController => {
  const authentication = createAuthenticationMachine()
  const completeLink = useAction(completeAccountLinkAction)
  const completeLinkSubmission = useSubmission(completeAccountLinkAction)
  const magicLinkSubmission = useSubmission(requestAccountMagicLinkAction)
  const signOutSubmission = useSubmission(signOutAccountSessionAction)
  const [email, setEmail] = createSignal('')
  const [accountSessionActive, setAccountSessionActive] = createSignal(false)
  const [localErrorMessage, setLocalErrorMessage] = createSignal<string | null>(null)
  const [localSuccessMessage, setLocalSuccessMessage] = createSignal<string | null>(null)
  const accountSession = createAsync(async () => {
    if (!accountSessionActive()) {
      return
    }

    return accountSessionQuery()
  })
  let accountCallbackErrorMessage: string | null = null
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
    const loadAccount = async () => {
      const url = new URL(window.location.href)
      const linkError = url.searchParams.get('link_error')
      const linkToken = url.searchParams.get('link_token')

      if (linkToken !== null) {
        const linkResult = await completeLink(linkToken)
        completeLinkSubmission.clear()
        url.searchParams.delete('link_token')

        if (linkError === 'email') {
          url.searchParams.delete('link_error')
        }

        window.history.replaceState(null, '', url)

        if (linkResult.status === 'linked') {
          setLocalSuccessMessage(m.web_account_linked())
        } else if (linkResult.status === 'invalid') {
          accountCallbackErrorMessage = m.web_account_link_expired()
          setLocalErrorMessage(accountCallbackErrorMessage)
        } else {
          authentication.send({type: 'resolve-unavailable'})
          throw new Error('Account link completion is unavailable')
        }
      } else if (linkError === 'email') {
        url.searchParams.delete('link_error')
        accountCallbackErrorMessage = m.web_account_link_invalid()
        setLocalErrorMessage(accountCallbackErrorMessage)
      }

      window.history.replaceState(null, '', url)
      setAccountSessionActive(true)
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
    if (!accountSessionActive()) {
      return
    }

    try {
      const resolvedSession = accountSession()

      if (resolvedSession === undefined) {
        return
      }

      authentication.send(getAccountSessionResolution(resolvedSession))
    } catch {
      setLocalSuccessMessage(null)

      if (accountCallbackErrorMessage === null) {
        setLocalErrorMessage(m.web_account_load_failed())
      }

      authentication.send({type: 'resolve-unavailable'})
    }
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
    isSubmitting: () =>
      completeLinkSubmission.pending === true ||
      magicLinkSubmission.pending === true ||
      signOutSubmission.pending === true,
    onEmailChange: setEmail,
    session,
    successMessage,
  }
}
