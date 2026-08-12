import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {FocusRoomStudio} from '../components/FocusRoomStudio'

const BACK_LINK_CLASSES = cx(
  'block rounded-full bg-black/34 px-4 py-3 text-sm font-650 text-white/88 no-underline',
  'backdrop-blur-xl hover:text-white',
)

const MAIN_CLASSES = cx(
  'relative h-dvh w-full overflow-hidden bg-#120f0d text-#fffaf1',
  'bg-[radial-gradient(circle_at_50%_0%,#3c3329_0%,#211b16_38%,#120f0d_76%)]',
)

export default function FocusRoomPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — 2D Focus Room</Title>
      <div class="relative h-full w-full">
        <nav aria-label="포커스 룸 탐색" class="absolute left-4 top-4 z-40 sm:left-7 sm:top-6">
          <A class={BACK_LINK_CLASSES} href="/">
            ← 실험실 목록
          </A>
        </nav>
        <FocusRoomStudio />
      </div>
    </main>
  )
}
