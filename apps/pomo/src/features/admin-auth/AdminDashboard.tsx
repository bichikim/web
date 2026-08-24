import {Title} from '@solidjs/meta'
import {useNavigate} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createSignal, type JSX} from 'solid-js'

import {signOutAdminSession} from './session.ts'

const BUTTON_CLASSES = cx(
  'h-10 rounded-3 border border-white/15 bg-white/5 px-4 text-sm font-700 text-white',
  'transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-2',
  'focus-visible:outline-offset-3 focus-visible:outline-#e8bc88 disabled:opacity-55',
)

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = createSignal(false)

  const handleSignOut: JSX.EventHandler<HTMLButtonElement, MouseEvent> = async () => {
    setIsSigningOut(true)

    try {
      const wasSignedOut = await signOutAdminSession()

      if (!wasSignedOut) {
        throw new Error('Admin sign-out failed')
      }

      navigate('/admin/login', {replace: true})
    } catch {
      // The protected page remains open so the administrator can retry revocation.
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>Pomo 관리자</Title>
      <header class="mx-auto flex w-full max-w-6xl items-center justify-between gap-5">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#e8bc88 uppercase">Pomo admin</p>
          <h1 class="mb-0 mt-2 text-2xl font-800 tracking--0.03em">콘텐츠 관리</h1>
        </div>
        <button
          class={BUTTON_CLASSES}
          disabled={isSigningOut()}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut() ? '로그아웃 중…' : '로그아웃'}
        </button>
      </header>

      <section class="mx-auto mt-12 w-full max-w-6xl rounded-5 border border-white/10 bg-white/4 p-6">
        <h2 class="m-0 text-lg font-750">Neon Auth 연결 완료</h2>
        <p class="mb-0 mt-3 max-w-xl text-sm leading-6 text-white/60">
          이 경로는 로그인 세션이 있을 때만 열립니다. 다음 단계에서 앨범과 음악 관리 화면을
          연결합니다.
        </p>
      </section>
    </main>
  )
}
