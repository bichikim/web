import {Title} from '@solidjs/meta'
import {createSignal, type JSX, Show} from 'solid-js'

import {requestAdminMagicLink} from './magic-link.ts'
import {
  ERROR_MESSAGE_CLASSES,
  FIELD_CLASSES,
  PAGE_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SUCCESS_MESSAGE_CLASSES,
} from './styles.ts'

export const AdminLogin = () => {
  const [email, setEmail] = createSignal('')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)
  const [isSubmitting, setIsSubmitting] = createSignal(false)

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    const form = event.currentTarget

    try {
      const wasSent = await requestAdminMagicLink({
        email: email(),
        origin: new URL(form.action).origin,
      })

      if (!wasSent) {
        setErrorMessage('로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }

      setSuccessMessage('등록된 관리자 계정이라면 로그인 링크를 이메일로 보냈습니다.')
    } catch {
      setErrorMessage('로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main class={PAGE_CLASSES}>
      <Title>Pomo 관리자 로그인</Title>
      <section class="w-full max-w-100">
        <header class="mb-8">
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#e8bc88 uppercase">Pomo admin</p>
          <h1 class="mb-0 mt-3 text-3xl font-800 tracking--0.03em">관리자 로그인</h1>
          <p class="mb-0 mt-3 text-sm leading-6 text-white/60">
            관리자 이메일로 일회용 로그인 링크를 보내드립니다.
          </p>
        </header>

        <form action="/api/auth/sign-in/magic-link" class="grid gap-5" onSubmit={handleSubmit}>
          <label class="grid gap-2 text-sm font-650">
            이메일
            <input
              autocomplete="email"
              class={FIELD_CLASSES}
              inputmode="email"
              name="email"
              onInput={(event) => setEmail(event.currentTarget.value)}
              required
              type="email"
              value={email()}
            />
          </label>

          <Show when={errorMessage()}>
            {(message) => (
              <p class={ERROR_MESSAGE_CLASSES} role="alert">
                {message()}
              </p>
            )}
          </Show>

          <Show when={successMessage()}>
            {(message) => (
              <p class={SUCCESS_MESSAGE_CLASSES} role="status">
                {message()}
              </p>
            )}
          </Show>

          <button class={PRIMARY_BUTTON_CLASSES} disabled={isSubmitting()} type="submit">
            {isSubmitting() ? '이메일 전송 중…' : '로그인 링크 받기'}
          </button>
        </form>
      </section>
    </main>
  )
}
