import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'

const TextMoodLab = clientOnly(() => import('src/components/TextMoodLab'), {lazy: true})
const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-4 py-8 text-#f8edf1',
  'xs:px-8 xs:py-12',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_8%,#365c54_0%,#292735_34%,#17131f_72%)]',
)
const FALLBACK_CLASSES = cx(
  'min-h-96 rounded-8 border border-white/10 bg-#211a2b/92 p-8 text-sm text-#bdb2c4',
  'shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl',
)

export default function TextMoodPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — 글 분위기 분석 실험실</Title>
      <div class={BACKGROUND_CLASSES} />
      <div class="relative mx-auto grid w-full max-w-6xl gap-4">
        <A class="w-fit text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev">
          ← 실험실 목록
        </A>
        <TextMoodLab
          fallback={
            <section aria-live="polite" class={FALLBACK_CLASSES}>
              브라우저의 온디바이스 분석 환경을 확인하고 있어요…
            </section>
          }
        />
      </div>
    </main>
  )
}
