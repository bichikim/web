import {createSignal, type JSX, onMount, Show} from 'solid-js'

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
    const loadAccount = async () => {
      const url = new URL(window.location.href)
      const linkToken = url.searchParams.get('link_token')

      if (linkToken !== null) {
        const linkResult = await completeAccountLink(linkToken)
        url.searchParams.delete('link_token')
        window.history.replaceState(null, '', url)

        if (linkResult === 'linked') {
          setSuccessMessage('토스 계정과 이메일 연결을 완료했습니다.')
        } else {
          setErrorMessage('계정 연결이 만료되었거나 다른 계정에 연결된 이메일입니다.')
        }
      }

      setSession(await readAccountSession())
      setIsLoading(false)
    }

    loadAccount().catch(() => {
      setErrorMessage('계정 정보를 불러오지 못했습니다.')
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
        setSuccessMessage('로그인 링크를 이메일로 보냈습니다. 처음이라면 계정도 함께 생성됩니다.')
      } else {
        setErrorMessage('로그인 이메일을 보내지 못했습니다.')
      }
    } catch {
      setErrorMessage('로그인 서버에 연결하지 못했습니다.')
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
      setSuccessMessage('로그아웃했습니다.')
    } catch {
      setErrorMessage('로그아웃하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Show when={!isLoading()} fallback={<p class="m-0 text-sm text-white/60">계정 확인 중…</p>}>
      <Show
        when={session()}
        fallback={
          <form action="/api/auth/sign-in/magic-link" class="grid gap-5" onSubmit={handleSubmit}>
            <p class="m-0 text-sm leading-6 text-white/60">
              이메일 링크로 로그인합니다. 처음 로그인하면 Pomo 계정이 생성됩니다.
            </p>
            <label class="grid gap-2 text-sm font-650">
              이메일
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
              {isSubmitting() ? '이메일 전송 중…' : '로그인 링크 받기'}
            </button>
          </form>
        }
      >
        {(account) => (
          <div class="grid gap-5">
            <div class="rounded-3 border border-white/10 bg-white/5 px-4 py-4">
              <p class="m-0 text-xs text-white/45">로그인된 이메일</p>
              <p class="mb-0 mt-1 break-all text-sm font-700">{account().email}</p>
            </div>
            <button
              class={ACCOUNT_SECONDARY_BUTTON_CLASSES}
              disabled={isSubmitting()}
              onClick={handleSignOut}
              type="button"
            >
              로그아웃
            </button>
          </div>
        )}
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
