import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {FocusRoomStudio} from '../components/FocusRoomStudio'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-hidden bg-#120f0d px-4 py-6 text-#fffaf1 sm:px-7 sm:py-8',
  'bg-[radial-gradient(circle_at_50%_0%,#3c3329_0%,#211b16_38%,#120f0d_76%)]',
)

export default function FocusRoomPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — 2D Focus Room</Title>
      <div class="relative mx-auto grid w-full max-w-7xl gap-5">
        <nav aria-label="포커스 룸 탐색" class="flex items-center justify-between gap-4">
          <A class="text-sm font-650 text-#c9c0b5 no-underline hover:text-white" href="/">
            ← 실험실 목록
          </A>
          <span class="text-xs font-650 text-#8f8377">12 scenes</span>
        </nav>
        <FocusRoomStudio />
      </div>
    </main>
  )
}
