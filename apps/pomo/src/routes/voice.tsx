import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {VoiceGenerator} from '../components/VoiceGenerator'

const MAIN_CLASSES = cx(
  'relative grid min-h-dvh place-items-center overflow-x-hidden',
  'bg-#17131f px-5 py-10 text-#f8edf1 sm:px-8',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_20%,#594560_0%,#2a2135_36%,#17131f_72%)]',
)
const GLOW_CLASSES = cx(
  'pointer-events-none absolute left-[8%] top-[18%] h-2 w-2 rounded-full',
  'bg-#f2a7b8/60 shadow-[0_0_30px_8px_rgba(242,167,184,0.22)]',
)

export default function VoicePage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — Voice Lab</Title>
      <div class={BACKGROUND_CLASSES} />
      <div class={GLOW_CLASSES} />
      <div class="relative grid w-full max-w-3xl gap-4">
        <nav class="flex flex-wrap items-center justify-between gap-4">
          <A class="text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/">
            ← 실험실 목록
          </A>
          <A
            class="text-sm font-650 text-#e3a7b5 no-underline hover:text-#ffc0ce"
            href="/custom-voice"
          >
            커스텀 목소리 실험실 →
          </A>
        </nav>
        <VoiceGenerator />
      </div>
    </main>
  )
}
