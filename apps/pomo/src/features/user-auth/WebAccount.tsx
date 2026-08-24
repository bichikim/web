import {createSignal, type JSX, onMount, Show} from 'solid-js'

import * as m from '../../paraglide/messages.js'

import {requestUserMagicLink} from './magic-link'
import {
  ACCOUNT_ERROR_CLASSES,
  ACCOUNT_FIELD_CLASSES,
  ACCOUNT_PRIMARY_BUTTON_CLASSES,
  ACCOUNT_SECONDARY_BUTTON_CLASSES,
  ACCOUNT_SUCCESS_CLASSES,
} from './styles'
import {
  type AccountSession,
  completeAccountLink,
  readAccountSession,
  signOutWebSession,
} from './web-session'

export const WebAccount = () => {
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

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const wasSent = await requestUserMagicLink({
        email: email(),
        origin: new URL(event.currentTarget.action).origin,
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

  const handleSignOut = async () => {
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

  return (
    <>
      <Show
        when={!isLoading()}
        fallback={<p class="m-0 text-sm text-white/60">{m.web_account_checking()}</p>}
      >
        <Show
          when={session()}
          fallback={
            <form action="/api/auth/sign-in/magic-link" class="grid gap-5" onSubmit={handleSubmit}>
              <p class="m-0 text-sm leading-6 text-white/60">{m.web_account_intro()}</p>
              <label class="grid gap-2 text-sm font-650">
                {m.web_account_email()}
                <input
                  autocomplete="email"
                  class={ACCOUNT_FIELD_CLASSES}
                  inputmode="email"
                  onInput={(event) => setEmail(event.currentTarget.value)}
                  required
                  type="email"
                  value={email()}
                />
              </label>
              <button
                class={ACCOUNT_PRIMARY_BUTTON_CLASSES}
                disabled={isSubmitting()}
                type="submit"
              >
                {isSubmitting() ? m.web_account_sending() : m.web_account_send()}
              </button>
            </form>
          }
        >
          {(account) => (
            <div class="grid gap-5">
              <div class="rounded-3 border border-white/10 bg-white/5 px-4 py-4">
                <p class="m-0 text-xs text-white/45">{m.web_account_signed_in_email()}</p>
                <p class="mb-0 mt-1 break-all text-sm font-700">{account().email}</p>
              </div>
              <button
                class={ACCOUNT_SECONDARY_BUTTON_CLASSES}
                disabled={isSubmitting()}
                onClick={handleSignOut}
                type="button"
              >
                {m.web_account_sign_out()}
              </button>
            </div>
          )}
        </Show>
        <Show when={successMessage()}>
          {(message) => (
            <p class={`${ACCOUNT_SUCCESS_CLASSES} mt-5`} role="status">
              {message()}
            </p>
          )}
        </Show>
      </Show>
      <Show when={errorMessage()}>
        {(message) => (
          <p class={`${ACCOUNT_ERROR_CLASSES} mt-5`} role="alert">
            {message()}
          </p>
        )}
      </Show>
    </>
  )
}
