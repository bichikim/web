import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {CharacterStudio} from 'src/components/CharacterStudio'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#0e1117 px-5 py-8 text-#f5f7fa xs:px-8',
  'bg-[radial-gradient(circle_at_70%_8%,#263a3c_0%,#151b23_34%,#0e1117_68%)]',
)

export default function CharacterPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — 3D Character Lab</Title>
      <div class="relative mx-auto grid w-full max-w-7xl gap-4">
        <nav class="flex items-center justify-between gap-4">
          <A class="text-sm font-650 text-#aab5bd no-underline hover:text-white" href="/dev">
            ← 실험실 목록
          </A>
          <A
            class="text-sm font-650 text-#e3a7b5 no-underline hover:text-#ffc0ce"
            href="/dev/voice"
          >
            음성 스튜디오 →
          </A>
        </nav>
        <CharacterStudio />
      </div>
    </main>
  )
}
