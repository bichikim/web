import * as m from '@paraglide/message'

import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {HttpStatusCode} from '@solidjs/start'
import {cx} from 'class-variance-authority'

const MAIN_CLASSES = cx(
  'relative grid min-h-dvh place-items-center overflow-hidden bg-#17131f px-5 py-12 text-#f8edf1',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)

const LINK_CLASSES = cx(
  'mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-#f2a7b8 px-6',
  'font-750 text-#211a2b no-underline transition-colors hover:bg-#ffd4de focus-visible:bg-#ffd4de',
)

export const NotFoundContent = () => {
  return (
    <main class={MAIN_CLASSES}>
      <Title>페이지를 찾을 수 없어요 — Pomofi</Title>
      <HttpStatusCode code={404} />
      <section class="max-w-lg text-center" aria-labelledby="not-found-heading">
        <p class="m-0 text-sm font-750 tracking-[0.24em] text-#f2a7b8 uppercase">404</p>
        <h1 class="mb-0 mt-4 text-3xl font-800 tracking--0.04em xs:text-5xl" id="not-found-heading">
          페이지를 찾을 수 없어요
        </h1>
        <p class="mb-0 mt-5 leading-7 text-#d8cbd9">
          주소가 올바른지 확인하거나 Pomofi 첫 화면으로 돌아가 주세요.
        </p>
        <A class={LINK_CLASSES} href="/">
          {m.app_return()}
        </A>
      </section>
    </main>
  )
}
