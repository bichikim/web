import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'

const MAIN_CLASSES = cx(
  'relative grid min-h-dvh place-items-center overflow-x-hidden',
  'bg-#17131f px-5 py-10 text-#f8edf1 sm:px-8',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_16%,#405d52_0%,#292735_34%,#17131f_72%)]',
)
const CLIENT_FALLBACK_CLASSES = cx(
  'w-full rounded-8 border border-white/10 bg-#211a2b/88 p-8',
  'text-sm text-#bdb2c4 shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl',
)
const DialogueWriter = clientOnly(() => import('src/components/DialogueWriter'), {lazy: true})

export default function DirectAnswerPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — Direct Answer Lab</Title>
      <div class={BACKGROUND_CLASSES} />
      <div class="relative grid w-full max-w-4xl gap-4">
        <A class="w-fit text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev">
          ← 실험실 목록
        </A>
        <DialogueWriter
          fallback={
            <section aria-live="polite" class={CLIENT_FALLBACK_CLASSES}>
              브라우저 환경을 확인하고 있어요…
            </section>
          }
        />
      </div>
    </main>
  )
}
