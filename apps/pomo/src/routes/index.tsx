import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'
import {lazy, Suspense} from 'solid-js'

const PStudio = lazy(async () => {
  const studioModule = await import('../components/PStudio')
  return {default: studioModule.PStudio}
})

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
        <Suspense fallback={<div class="pomo-scene-fallback">Pomo를 준비하고 있어요…</div>}>
          <PStudio />
        </Suspense>
      </div>
    </main>
  )
}
