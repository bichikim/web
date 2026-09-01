import {Title} from '@solidjs/meta'
import {useAction} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import {requestAdminMagicLinkAction} from '../features/auth/actions'
import {useAdminLogin} from '../features/admin-auth'
import {PButton} from './PButton'
import {PFormMessage} from './PFormMessage'
import {PTextField} from './PTextField'

const PAGE_CLASSES = cx(
  'grid min-h-dvh place-items-center bg-#15120f px-5 py-12 text-#fffaf1',
  'bg-[radial-gradient(circle_at_50%_0%,#453a30_0%,#211b16_42%,#15120f_78%)]',
)

export const AdminLogin = () => {
  const login = useAdminLogin()
  const requestMagicLink = useAction(requestAdminMagicLinkAction)

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await requestMagicLink(new FormData(event.currentTarget))
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

        <form
          action="/api/auth/sign-in/magic-link"
          class="grid gap-5"
          method="post"
          onSubmit={handleSubmit}
        >
          <PTextField
            autoComplete="email"
            inputMode="email"
            label="이메일"
            name="email"
            onChange={login.onEmailChange}
            required
            type="email"
            value={login.email()}
          />

          <Show when={login.errorMessage()}>
            {(message) => <PFormMessage tone="error">{message()}</PFormMessage>}
          </Show>

          <Show when={login.successMessage()}>
            {(message) => <PFormMessage tone="success">{message()}</PFormMessage>}
          </Show>

          <PButton class="mt-2 w-full" disabled={login.isSubmitting()} type="submit">
            {login.isSubmitting() ? '이메일 전송 중…' : '로그인 링크 받기'}
          </PButton>
        </form>
      </section>
    </main>
  )
}
