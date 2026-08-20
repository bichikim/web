import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'

import {PStudio} from '../components/PStudio'

const MAIN_CLASSES = cx(
  'pomo-home',
  'relative h-dvh w-full overflow-hidden bg-#120f0d text-#fffaf1',
  'bg-[radial-gradient(circle_at_50%_0%,#3c3329_0%,#211b16_38%,#120f0d_76%)]',
)

export default function HomePage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi</Title>
      <div class="pomo-home-stage relative h-full w-full">
        <PStudio />
      </div>
    </main>
  )
}
