import {Title} from '@solidjs/meta'
import {type JSX, Show} from 'solid-js'

import {useAdminLogin} from '../features/admin-auth'
import {
  ERROR_MESSAGE_CLASSES,
  FIELD_CLASSES,
  PAGE_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SUCCESS_MESSAGE_CLASSES,
} from './admin-auth/styles'

export const AdminLogin = () => {
  const login = useAdminLogin()

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await login.onSubmit(new URL(event.currentTarget.action).origin)
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
              onInput={(event) => login.onEmailChange(event.currentTarget.value)}
              required
              type="email"
              value={login.email()}
            />
          </label>

          <Show when={login.errorMessage()}>
            {(message) => (
              <p class={ERROR_MESSAGE_CLASSES} role="alert">
                {message()}
              </p>
            )}
          </Show>

          <Show when={login.successMessage()}>
            {(message) => (
              <p class={SUCCESS_MESSAGE_CLASSES} role="status">
                {message()}
              </p>
            )}
          </Show>

          <button class={PRIMARY_BUTTON_CLASSES} disabled={login.isSubmitting()} type="submit">
            {login.isSubmitting() ? '이메일 전송 중…' : '로그인 링크 받기'}
          </button>
        </form>
      </section>
    </main>
  )
}
