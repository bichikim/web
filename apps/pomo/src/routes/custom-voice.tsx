import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'

const CustomVoiceStudio = clientOnly(() => import('../components/CustomVoiceStudio'), {
  lazy: true,
})
const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1 sm:px-8',
  'bg-[radial-gradient(circle_at_55%_12%,#594560_0%,#2a2135_36%,#17131f_72%)]',
)

const StudioFallback = () => (
  <section
    aria-busy="true"
    aria-live="polite"
    class="min-h-72 rounded-8 border border-white/10 bg-#211a2b/88 p-6 sm:p-8"
  >
    <p class="m-0 text-xs font-700 tracking-[0.24em] text-#f2a7b8 uppercase">
      Supertonic custom voice lab
    </p>
    <h1 class="mb-0 mt-3 text-2xl font-750">브라우저 음성 도구를 준비하고 있어요</h1>
    <p class="mb-0 mt-3 max-w-xl text-sm leading-6 text-#bdb2c4">
      이 페이지의 파일 읽기와 음성 합성 기능은 브라우저에서만 시작됩니다.
    </p>
  </section>
)

export default function CustomVoicePage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — Custom Voice Lab</Title>
      <div class="relative mx-auto grid w-full max-w-4xl gap-4">
        <nav class="flex flex-wrap items-center justify-between gap-4">
          <A class="text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/">
            ← 실험실 목록
          </A>
          <A class="text-sm font-650 text-#e3a7b5 no-underline hover:text-#ffc0ce" href="/voice">
            기본 목소리 실험실 →
          </A>
        </nav>
        <CustomVoiceStudio fallback={<StudioFallback />} />
      </div>
    </main>
  )
}
