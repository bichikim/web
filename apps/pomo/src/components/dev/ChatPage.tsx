import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {ChatWorkspace} from './chat/Workspace'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-4 py-7 text-#f8edf1 xs:px-7 xs:py-10',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#405d52_0%,#292735_32%,#17131f_72%)]',
)
const FALLBACK_CLASSES = cx(
  'min-h-96 rounded-8 border border-white/10 bg-#211a2b/88 p-8 text-sm text-#bdb2c4',
  'shadow-[0_1.75rem_6.25rem_rgba(5,2,10,0.45)] backdrop-blur-xl',
)

function ChatPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — On-device Chat</Title>
      <div class={BACKGROUND_CLASSES} />
      <div class="relative mx-auto grid w-full max-w-6xl gap-4">
        <A class="w-fit text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev">
          ← 실험실 목록
        </A>
        <ChatWorkspace
          fallback={
            <section aria-live="polite" class={FALLBACK_CLASSES}>
              브라우저 채팅 환경을 확인하고 있어요…
            </section>
          }
        />
      </div>
    </main>
  )
}

export default ChatPage
