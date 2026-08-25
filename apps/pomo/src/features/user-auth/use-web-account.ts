import {createSignal, onMount} from 'solid-js'

import * as m from '@paraglide/message'

import {requestUserMagicLink} from './magic-link'
import {
  type AccountSession,
  completeAccountLink,
  readAccountSession,
  signOutWebSession,
} from './web-session'

export interface WebAccountController {
  readonly email: () => string
  readonly errorMessage: () => string | null
  readonly isLoading: () => boolean
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly onSignOut: () => Promise<void>
  readonly onSubmit: (origin: string) => Promise<void>
  readonly session: () => AccountSession | null
  readonly successMessage: () => string | null
}

export const useWebAccount = (): WebAccountController => {
  const [email, setEmail] = createSignal('')
  const [session, setSession] = createSignal<AccountSession | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)

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
          setSuccessMessage(m.web_account_linked())
        } else {
          accountCallbackErrorMessage = m.web_account_link_expired()
          setErrorMessage(accountCallbackErrorMessage)
        }
      } else if (linkError === 'email') {
        url.searchParams.delete('link_error')
        window.history.replaceState(null, '', url)
        accountCallbackErrorMessage = m.web_account_link_invalid()
        setErrorMessage(accountCallbackErrorMessage)
      }

      setSession(await readAccountSession())
      setIsLoading(false)
    }

    loadAccount().catch(() => {
      setSuccessMessage(null)

      if (accountCallbackErrorMessage === null) {
        setErrorMessage(m.web_account_load_failed())
      }

      setIsLoading(false)
    })
  })

  const onSubmit = async (origin: string) => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const wasSent = await requestUserMagicLink({
        email: email(),
        origin,
      })

      if (wasSent) {
        setSuccessMessage(m.web_account_magic_link_sent())
      } else {
        setErrorMessage(m.web_account_magic_link_failed())
      }
    } catch {
      setErrorMessage(m.web_account_server_failed())
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSignOut = async () => {
    setIsSubmitting(true)

    try {
      const wasSignedOut = await signOutWebSession()

      if (!wasSignedOut) {
        throw new Error('Web sign-out failed')
      }

      setSession(null)
      setSuccessMessage(m.web_account_signed_out())
    } catch {
      setErrorMessage(m.web_account_sign_out_failed())
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    email,
    errorMessage,
    isLoading,
    isSubmitting,
    onEmailChange: setEmail,
    onSignOut,
    onSubmit,
    session,
    successMessage,
  }
}
