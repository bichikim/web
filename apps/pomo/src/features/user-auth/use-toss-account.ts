import {useNavigate} from '@solidjs/router'
import {createSignal, onCleanup, onMount} from 'solid-js'

import * as m from '@paraglide/message'

import {createAuthenticationMachine} from '../auth/machine'
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
      navigate('/', {replace: true})
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
  const authentication = createAuthenticationMachine()
  const login = useLoginNavigation()
  const [token, setToken] = createSignal<string | null>(null)
  const [email, setEmail] = createSignal('')
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)

  onMount(() => {
    const restoreSession = async () => {
      const storedToken = await readStoredAppSession()

      if (storedToken === null) {
        authentication.send({type: 'resolve-anonymous'})
        return
      }

      if (await validateAppSession(storedToken)) {
        setToken(storedToken)
        authentication.send({
          session: {kind: 'authenticated', provider: 'toss'},
          type: 'resolve-authenticated',
        })
        return
      }

      await clearStoredAppSession()
      authentication.send({type: 'resolve-anonymous'})
    }

    restoreSession().catch(() => {
      setErrorMessage(m.account_toss_session_failed())
      authentication.send({type: 'resolve-unavailable'})
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

    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const result = await revokeTossLoginSession(currentToken)
      setToken(null)
      authentication.send({type: 'sign-out'})

      if (result.storageStatus === 'cleared') {
        setSuccessMessage(m.account_toss_logout_success())
      } else {
        setErrorMessage(m.account_toss_logout_cleanup_pending())
      }
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
    isLoading: () => authentication.state().kind === 'checking',
    isSubmitting,
    onEmailChange: setEmail,
    onEmailLink,
    onLogin,
    onLogout,
    successMessage,
    token,
  }
}
