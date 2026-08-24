import {createSignal, type JSX, onMount, Show} from 'solid-js'

import {
  type AccountLinkEmailResult,
  clearStoredAppSession,
  createTossLoginSession,
  readStoredAppSession,
  requestAccountLinkEmail,
  revokeTossLoginSession,
  validateAppSession,
} from './app-session'
import {
  ACCOUNT_ERROR_CLASSES,
  ACCOUNT_FIELD_CLASSES,
  ACCOUNT_PRIMARY_BUTTON_CLASSES,
  ACCOUNT_SECONDARY_BUTTON_CLASSES,
  ACCOUNT_SUCCESS_CLASSES,
} from './styles'
import * as m from '../../paraglide/messages.js'

interface AccountLinkFeedback {
  readonly errorMessage: string | null
  readonly successMessage: string | null
}

const getAccountLinkFeedback = (result: AccountLinkEmailResult): AccountLinkFeedback => {
  switch (result.status) {
    case 'sent': {
      return {
        errorMessage: null,
        successMessage: m.account_toss_link_sent(),
      }
    }
    case 'not-sent': {
      return {errorMessage: m.account_toss_link_failed(), successMessage: null}
    }
    case 'rate-limited': {
      const errorMessage =
        result.retryAfterSeconds === null
          ? m.account_toss_rate_limited()
          : m.account_toss_rate_limited_seconds({seconds: result.retryAfterSeconds})

      return {errorMessage, successMessage: null}
    }
    default: {
      const unhandledResult: never = result
      return unhandledResult
    }
  }
}

export const TossAccount = () => {
  const [token, setToken] = createSignal<string | null>(null)
  const [email, setEmail] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(true)
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)

  onMount(() => {
    const restoreSession = async () => {
      const storedToken = await readStoredAppSession()

      if (storedToken !== null && (await validateAppSession(storedToken))) {
        setToken(storedToken)
      } else if (storedToken !== null) {
        await clearStoredAppSession()
      }

      setIsLoading(false)
    }

    restoreSession().catch(() => {
      setErrorMessage(m.account_toss_session_failed())
      setIsLoading(false)
    })
  })

  const handleLogin = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      setToken(await createTossLoginSession())
      setSuccessMessage(m.account_toss_login_success())
    } catch {
      setErrorMessage(m.account_toss_login_failed())
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    const currentToken = token()

    if (currentToken === null) {
      return
    }

    setIsSubmitting(true)

    try {
      await revokeTossLoginSession(currentToken)
      setToken(null)
      setSuccessMessage(m.account_toss_logout_success())
    } catch {
      setErrorMessage(m.account_toss_logout_failed())
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailLink: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const currentToken = token()

    if (currentToken === null) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const result = await requestAccountLinkEmail(currentToken, email())
      const feedback = getAccountLinkFeedback(result)
      setErrorMessage(feedback.errorMessage)
      setSuccessMessage(feedback.successMessage)
    } catch {
      setErrorMessage(m.account_toss_link_server_failed())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Show
      when={!isLoading()}
      fallback={<p class="m-0 text-sm text-white/60">{m.account_toss_checking()}</p>}
    >
      <Show
        when={token()}
        fallback={
          <div class="grid gap-5">
            <p class="m-0 text-sm leading-6 text-white/60">{m.account_toss_intro()}</p>
            <button
              class={ACCOUNT_PRIMARY_BUTTON_CLASSES}
              disabled={isSubmitting()}
              onClick={handleLogin}
              type="button"
            >
              {isSubmitting() ? m.account_toss_confirming() : m.account_toss_start()}
            </button>
          </div>
        }
      >
        <div class="grid gap-6">
          <div class="rounded-3 border border-white/10 bg-white/5 px-4 py-4">
            <p class="m-0 text-sm font-750">{m.account_toss_active()}</p>
            <p class="mb-0 mt-1 text-xs leading-5 text-white/50">
              {m.account_toss_email_optional()}
            </p>
          </div>

          <form class="grid gap-4" onSubmit={handleEmailLink}>
            <div>
              <h2 class="m-0 text-base font-750">{m.account_toss_use_on_web()}</h2>
              <p class="mb-0 mt-1 text-xs leading-5 text-white/50">
                {m.account_toss_web_description()}
              </p>
            </div>
            <label class="grid gap-2 text-sm font-650">
              {m.account_toss_email_label()}
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
            <button class={ACCOUNT_PRIMARY_BUTTON_CLASSES} disabled={isSubmitting()} type="submit">
              {isSubmitting() ? m.account_toss_sending_email() : m.account_toss_link_web()}
            </button>
          </form>

          <button
            class={ACCOUNT_SECONDARY_BUTTON_CLASSES}
            disabled={isSubmitting()}
            onClick={handleLogout}
            type="button"
          >
            {m.account_toss_logout()}
          </button>
        </div>
      </Show>

      <Show when={errorMessage()}>
        {(message) => (
          <p class={`${ACCOUNT_ERROR_CLASSES} mt-5`} role="alert">
            {message()}
          </p>
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
  )
}
