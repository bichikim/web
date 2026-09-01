import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'
import {lazy, Suspense} from 'solid-js'

import {PSceneFallback} from './p-studio/SceneFallback'

const PStudio = lazy(async () => {
  const studioModule = await import('./PStudio')
  return {default: studioModule.PStudio}
})

const MAIN_CLASSES = cx(
  'pomo-home',
  'relative h-dvh w-full overflow-hidden bg-background text-foreground',
  !(import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') &&
    'bg-[radial-gradient(circle_at_50%_0%,#3c3329_0%,#211b16_38%,#120f0d_76%)]',
)

export const PHomePage = () => (
  <main class={MAIN_CLASSES}>
    <Title>Pomofi</Title>
    <div class="pomo-home-stage relative h-full w-full">
      <Suspense fallback={<PSceneFallback />}>
        <PStudio />
      </Suspense>
    </div>
  </main>
)
