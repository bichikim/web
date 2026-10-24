import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {WorldStudio} from 'src/components/world-studio/WorldStudio'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#0d1118 px-5 py-8 text-#f5f7fa xs:px-8',
  'bg-[radial-gradient(circle_at_72%_6%,#354748_0%,#1a222a_35%,#0d1118_72%)]',
)

export function WorldPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — 3D World Lookdev</Title>
      <div class="relative mx-auto grid w-full max-w-7xl gap-4">
        <nav class="flex items-center justify-between gap-4">
          <A class="text-sm font-650 text-#aab5bd no-underline hover:text-white" href="/dev">
            ← 실험실 목록
          </A>
          <A
            class="text-sm font-650 text-#b8e8d0 no-underline hover:text-white"
            href="/dev/character"
          >
            캐릭터 스튜디오 →
          </A>
        </nav>
        <WorldStudio />
      </div>
    </main>
  )
}
