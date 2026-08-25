import {useNavigate} from '@solidjs/router'
import {createSignal, onCleanup, onMount} from 'solid-js'

import * as m from '@paraglide/message'
import {localizeHref} from '@paraglide/runtime'

import {
  type AccountLinkEmailResult,
  clearStoredAppSession,
  createTossLoginSession,
  readStoredAppSession,
  requestAccountLinkEmail,
  revokeTossLoginSession,
  validateAppSession,
} from './app-session'

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

const useLoginNavigation = () => {
  const navigate = useNavigate()
  let isActive = true

  onCleanup(() => {
    isActive = false
  })

  return async () => {
    await createTossLoginSession()

    if (isActive) {
      navigate(localizeHref('/'), {replace: true})
    }
  }
}

export interface TossAccountController {
  readonly email: () => string
  readonly errorMessage: () => string | null
  readonly isLoading: () => boolean
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly onEmailLink: () => Promise<void>
  readonly onLogin: () => Promise<void>
  readonly onLogout: () => Promise<void>
  readonly successMessage: () => string | null
  readonly token: () => string | null
}

export const useTossAccount = (): TossAccountController => {
  const login = useLoginNavigation()
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

  const onLogin = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      await login()
    } catch {
      setErrorMessage(m.account_toss_login_failed())
    } finally {
      setIsSubmitting(false)
    }
  }

  const onLogout = async () => {
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

  const onEmailLink = async () => {
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

  return {
    email,
    errorMessage,
    isLoading,
    isSubmitting,
    onEmailChange: setEmail,
    onEmailLink,
    onLogin,
    onLogout,
    successMessage,
    token,
  }
}
