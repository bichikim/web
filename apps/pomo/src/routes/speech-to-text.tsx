import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'

const SpeechToTextLab = clientOnly(() => import('../components/SpeechToTextLab'), {lazy: true})
const MAIN_CLASSES = cx(
  'relative grid min-h-dvh place-items-center overflow-x-hidden',
  'bg-#17131f px-4 py-8 text-#f8edf1 sm:px-8 sm:py-12',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_12%,#405d52_0%,#292735_35%,#17131f_74%)]',
)
const FALLBACK_CLASSES = cx(
  'min-h-96 rounded-8 border border-white/10 bg-#211a2b/92 p-8 text-sm text-#bdb2c4',
  'shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl',
)

export default function SpeechToTextPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — 한국어 받아쓰기 실험실</Title>
      <div class={BACKGROUND_CLASSES} />
      <div class="relative grid w-full max-w-4xl gap-4">
        <A class="w-fit text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/">
          ← 실험실 목록
        </A>
        <SpeechToTextLab
          fallback={
            <section aria-live="polite" class={FALLBACK_CLASSES}>
              브라우저의 마이크와 음성 인식 환경을 확인하고 있어요…
            </section>
          }
        />
      </div>
    </main>
  )
}
