import {useAction, useNavigate, useSubmission} from '@solidjs/router'
import {createSignal, onCleanup, onMount} from 'solid-js'

import * as m from '@paraglide/message'

import {createAuthenticationMachine} from '../auth/machine'
import {
  type AccountLinkEmailActionResult,
  createTossLoginSessionAction,
  requestAccountLinkEmailAction,
  revokeTossLoginSessionAction,
} from './actions'
import {clearStoredAppSession, readStoredAppSession, validateAppSession} from './app-session'

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
  readonly isLoading: () => boolean
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly onEmailLink: (values: FormData) => Promise<void>
  readonly onLogin: () => Promise<void>
  readonly onLogout: () => Promise<void>
  readonly successMessage: () => string | null
  readonly token: () => string | null
}

export const useTossAccount = (): TossAccountController => {
  const authentication = createAuthenticationMachine()
  const navigate = useNavigate()
  const login = useAction(createTossLoginSessionAction)
  const loginSubmission = useSubmission(createTossLoginSessionAction)
  const logout = useAction(revokeTossLoginSessionAction)
  const logoutSubmission = useSubmission(revokeTossLoginSessionAction)
  const requestEmailLink = useAction(requestAccountLinkEmailAction)
  const emailLinkSubmission = useSubmission(requestAccountLinkEmailAction)
  const [token, setToken] = createSignal<string | null>(null)
  const [email, setEmail] = createSignal('')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)
  let isActive = true

  onCleanup(() => {
    isActive = false
  })

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
    const result = await login()
    if (result.status === 'unavailable') {
      setErrorMessage(m.account_toss_login_failed())
      authentication.send({type: 'resolve-unavailable'})
      return
    }

    if (isActive) {
      authentication.send({
        session: {kind: 'authenticated', provider: 'toss'},
        type: 'resolve-authenticated',
      })
      navigate('/', {replace: true})
    }
  }

  const onLogout = async () => {
    const currentToken = token()

    if (currentToken === null) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    const result = await logout()
    if (result.status !== 'unavailable') {
      setToken(null)
      authentication.send({type: 'sign-out'})

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
    const currentToken = token()

    if (currentToken === null) {
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
    token,
  }
}
