import {createSignal, type JSX, onMount, Show} from 'solid-js'

import {
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
      setErrorMessage('로그인 상태를 확인하지 못했습니다.')
      setIsLoading(false)
    })
  })

  const handleLogin = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      setToken(await createTossLoginSession())
      setSuccessMessage('토스 계정으로 가입 및 로그인했습니다.')
    } catch {
      setErrorMessage('토스 로그인을 완료하지 못했습니다.')
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
      setSuccessMessage('로그아웃했습니다.')
    } catch {
      setErrorMessage('로그아웃하지 못했습니다.')
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
      const wasSent = await requestAccountLinkEmail(currentToken, email())

      if (wasSent) {
        setSuccessMessage('웹 로그인 연결 링크를 이메일로 보냈습니다.')
      } else {
        setErrorMessage('연결 이메일을 보내지 못했습니다.')
      }
    } catch {
      setErrorMessage('계정 연결 서버에 접속하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Show when={!isLoading()} fallback={<p class="m-0 text-sm text-white/60">계정 확인 중…</p>}>
      <Show
        when={token()}
        fallback={
          <div class="grid gap-5">
            <p class="m-0 text-sm leading-6 text-white/60">
              토스 로그인 한 번으로 Pomo 계정이 바로 생성됩니다. 이메일은 필요하지 않습니다.
            </p>
            <button
              class={ACCOUNT_PRIMARY_BUTTON_CLASSES}
              disabled={isSubmitting()}
              onClick={handleLogin}
              type="button"
            >
              {isSubmitting() ? '토스 확인 중…' : '토스로 시작하기'}
            </button>
          </div>
        }
      >
        <div class="grid gap-6">
          <div class="rounded-3 border border-white/10 bg-white/5 px-4 py-4">
            <p class="m-0 text-sm font-750">토스 계정으로 사용 중</p>
            <p class="mb-0 mt-1 text-xs leading-5 text-white/50">
              앱만 사용한다면 이메일을 등록하지 않아도 됩니다.
            </p>
          </div>

          <form class="grid gap-4" onSubmit={handleEmailLink}>
            <div>
              <h2 class="m-0 text-base font-750">웹에서도 사용하기</h2>
              <p class="mb-0 mt-1 text-xs leading-5 text-white/50">
                이메일 링크를 확인하면 웹에서도 같은 계정으로 로그인할 수 있습니다.
              </p>
            </div>
            <label class="grid gap-2 text-sm font-650">
              연결할 이메일
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
              {isSubmitting() ? '이메일 전송 중…' : '웹 로그인 연결하기'}
            </button>
          </form>

          <button
            class={ACCOUNT_SECONDARY_BUTTON_CLASSES}
            disabled={isSubmitting()}
            onClick={handleLogout}
            type="button"
          >
            로그아웃
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
