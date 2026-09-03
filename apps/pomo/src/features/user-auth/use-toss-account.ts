import {useAction, useNavigate, useSubmission} from '@solidjs/router'
import {createEffect, createSignal, onCleanup} from 'solid-js'

import * as m from '@paraglide/message'

import {useAuth} from '../auth/AuthProvider'
import {
  type AccountLinkEmailActionResult,
  createTossLoginSessionAction,
  requestAccountLinkEmailAction,
  revokeTossLoginSessionAction,
} from './actions'

interface AccountLinkFeedback {
  readonly errorMessage: string | null
  readonly successMessage: string | null
}

const getAccountLinkFeedback = (result: AccountLinkEmailActionResult): AccountLinkFeedback => {
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
    case 'unavailable': {
      return {errorMessage: m.account_toss_link_server_failed(), successMessage: null}
    }
    default: {
      const unhandledResult: never = result
      return unhandledResult
    }
  }
}

export interface TossAccountController {
  readonly email: () => string
  readonly errorMessage: () => string | null
  readonly isAuthenticated: () => boolean
  readonly isLoading: () => boolean
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly onEmailLink: (values: FormData) => Promise<void>
  readonly onLogin: () => Promise<void>
  readonly onLogout: () => Promise<void>
  readonly successMessage: () => string | null
}

export const useTossAccount = (): TossAccountController => {
  const authentication = useAuth()
  const navigate = useNavigate()
  const login = useAction(createTossLoginSessionAction)
  const loginSubmission = useSubmission(createTossLoginSessionAction)
  const logout = useAction(revokeTossLoginSessionAction)
  const logoutSubmission = useSubmission(revokeTossLoginSessionAction)
  const requestEmailLink = useAction(requestAccountLinkEmailAction)
  const emailLinkSubmission = useSubmission(requestAccountLinkEmailAction)
  const [email, setEmail] = createSignal('')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)
  let isActive = true

  onCleanup(() => {
    isActive = false
  })

  createEffect(() => {
    if (authentication.state().kind === 'unavailable') {
      setErrorMessage(m.account_toss_session_failed())
    }
  })

  const onLogin = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    const result = await login()
    if (result.status === 'unavailable') {
      setErrorMessage(m.account_toss_login_failed())
      return
    }

    if (isActive) {
      navigate('/', {replace: true})
    }
  }

  const onLogout = async () => {
    if (!(authentication.session()?.provider === 'toss')) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    const result = await logout()
    if (result.status !== 'unavailable') {
      if (result.status === 'signed-out') {
        setSuccessMessage(m.account_toss_logout_success())
      } else {
        setErrorMessage(m.account_toss_logout_cleanup_pending())
      }
      return
    }

    setErrorMessage(m.account_toss_logout_failed())
  }

  const onEmailLink = async (values: FormData) => {
    if (!(authentication.session()?.provider === 'toss')) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    const result = await requestEmailLink(values)
    emailLinkSubmission.clear()
    const feedback = getAccountLinkFeedback(result)
    setErrorMessage(feedback.errorMessage)
    setSuccessMessage(feedback.successMessage)
  }

  return {
    email,
    errorMessage,
    isAuthenticated: () => authentication.session()?.provider === 'toss',
    isLoading: () => authentication.state().kind === 'checking',
    isSubmitting: () =>
      loginSubmission.pending === true ||
      logoutSubmission.pending === true ||
      emailLinkSubmission.pending === true,
    onEmailChange: setEmail,
    onEmailLink,
    onLogin,
    onLogout,
    successMessage,
  }
}
