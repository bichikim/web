import {cx} from 'class-variance-authority'

import {PStudio} from '../p-studio/PStudio'

const MAIN_CLASSES = cx(
  'relative h-dvh w-full overflow-hidden text-foreground',
  import.meta.env.VITE_POMO_IS_DESKTOP === 'true'
    ? 'pomo-desktop-background bg-transparent'
    : 'bg-background',
  import.meta.env.VITE_POMO_IS_DESKTOP !== 'true' &&
    !(import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') &&
    'bg-[radial-gradient(circle_at_50%_0%,#3c3329_0%,#211b16_38%,#120f0d_76%)]',
)

export const PHomePage = () => (
  <main class={MAIN_CLASSES}>
    <div class="relative h-full w-full">
      <PStudio />
    </div>
  </main>
)
