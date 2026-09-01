import {Title} from '@solidjs/meta'
import {A, useAction} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import {signOutAdminSessionAction} from '../features/auth/actions'
import {useAdminDashboard} from '../features/admin-auth'
import {PFormMessage} from './PFormMessage'

const BUTTON_CLASSES = cx(
  'h-10 rounded-3 border border-white/15 bg-white/5 px-4 text-sm font-700 text-white',
  'transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-2',
  'focus-visible:outline-offset-3 focus-visible:outline-#e8bc88 disabled:opacity-55',
)
const MUSIC_CARD_CLASSES = cx(
  'group rounded-5 border border-white/10 bg-white/4 p-6 text-inherit no-underline transition',
  'hover:border-#e8bc88/55 hover:bg-white/7 focus-visible:outline-2',
  'focus-visible:outline-offset-3 focus-visible:outline-#e8bc88',
)

export const AdminDashboard = () => {
  const dashboard = useAdminDashboard()
  const signOut = useAction(signOutAdminSessionAction)

  const handleSignOut: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await signOut(new FormData(event.currentTarget))
  }

  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>Pomo 관리자</Title>
      <header class="mx-auto flex w-full max-w-6xl items-center justify-between gap-5">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#e8bc88 uppercase">Pomo admin</p>
          <h1 class="mb-0 mt-2 text-2xl font-800 tracking--0.03em">콘텐츠 관리</h1>
        </div>
        <form action="/api/auth/sign-out" method="post" onSubmit={handleSignOut}>
          <button class={BUTTON_CLASSES} disabled={dashboard.isSigningOut()} type="submit">
            {dashboard.isSigningOut() ? '로그아웃 중…' : '로그아웃'}
          </button>
        </form>
      </header>

      <Show when={dashboard.errorMessage()}>
        {(message) => (
          <PFormMessage class="mx-auto mt-5 w-full max-w-6xl" tone="error">
            {message()}
          </PFormMessage>
        )}
      </Show>

      <section class="mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2">
        <A class={MUSIC_CARD_CLASSES} href="/admin/music">
          <p class="m-0 text-xs font-750 tracking-[0.18em] text-#e8bc88 uppercase">Catalog</p>
          <h2 class="mb-0 mt-3 text-lg font-750">음악 / 앨범 관리</h2>
          <p class="mb-0 mt-3 max-w-xl text-sm leading-6 text-white/60">
            유료 앨범 초안을 만들고 앨범에 곡 정보를 등록합니다.
          </p>
          <span class="mt-6 inline-block text-sm font-700 text-#f3d1a9 group-hover:underline">
            관리 페이지 열기 →
          </span>
        </A>
      </section>
    </main>
  )
}
