import * as m from '@paraglide/message'

import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {SERVICE_POLICY_PATHS} from 'src/features/service-terms/policy-paths'
import {HomeCards} from './home/HomeCards'

const MAIN_CLASSES = cx(
  'relative grid min-h-dvh place-items-center overflow-hidden',
  'bg-#17131f px-5 py-12 text-#f8edf1 sm:px-8',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_10%,#624b68_0%,#2a2135_36%,#17131f_72%)]',
)
const POMO_LINK_CLASSES = cx(
  'mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-700 text-#f4d7b5',
  'no-underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4',
  'focus-visible:outline-#f4d7b5',
)

export function HomePage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — Creative Labs</Title>
      <div class={BACKGROUND_CLASSES} />
      <section class="relative w-full max-w-5xl">
        <A class={POMO_LINK_CLASSES} href="/">
          <span aria-hidden="true" class="i-tabler-arrow-left size-4" />
          {m.app_return()}
        </A>
        <header class="max-w-2xl">
          <p class="m-0 text-xs font-750 tracking-[0.28em] text-#f2a7b8 uppercase">
            Pomofi creative labs
          </p>
          <h1 class="mb-0 mt-4 text-4xl font-800 tracking--0.045em sm:text-6xl">
            캐릭터를 만들고,
            <br />
            목소리를 입혀 보세요
          </h1>
          <p class="mb-0 mt-5 max-w-xl text-base leading-7 text-#bdb2c4 sm:text-lg">
            각 기능은 독립된 주소에서 실험할 수 있어요. 먼저 3D 캐릭터를 확인하거나 기기 안에서
            음성을 생성해 보세요.
          </p>
        </header>

        <HomeCards />

        <footer class="mt-8 flex justify-end">
          <A
            class="text-xs font-650 text-#8f8297 no-underline hover:text-white"
            href={SERVICE_POLICY_PATHS.web.terms}
          >
            서비스 이용약관
          </A>
        </footer>
      </section>
    </main>
  )
}
