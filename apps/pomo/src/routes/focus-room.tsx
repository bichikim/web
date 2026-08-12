import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'

import {FocusRoomStudio} from '../components/FocusRoomStudio'

const MAIN_CLASSES = cx(
  'relative h-dvh w-full overflow-hidden bg-#120f0d text-#fffaf1',
  'bg-[radial-gradient(circle_at_50%_0%,#3c3329_0%,#211b16_38%,#120f0d_76%)]',
)

export default function FocusRoomPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — 2D Focus Room</Title>
      <div class="relative h-full w-full">
        <FocusRoomStudio />
      </div>
    </main>
  )
}
