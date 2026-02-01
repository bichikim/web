import {lazy, Show, Suspense} from 'solid-js'
import {isServer} from 'solid-js/web'

const ScrollStage = lazy(() =>
  import('../../components/scroll-stage/ScrollStage').then((m) => ({
    default: m.ScrollStage,
  })),
)

let contentRef: HTMLElement | undefined

export default function HomePage() {
  return (
    <>
      <div
        class="content fixed inset-0 z-10 overflow-hidden bg-transparent"
        ref={(element) => {
          contentRef = element
        }}
      >
        <div class="scroll__content text-white">
          <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
            <span class="section__title-number text-6xl font-bold opacity-60">01</span>
            <h2 class="section__title-text mt-2 text-4xl font-bold">Logma</h2>
            <div class="section__title-arrow mt-4 flex gap-2">
              <span class="block h-1 w-8 bg-current" />
              <span class="block h-1 w-8 bg-current" />
            </div>
            <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">
              The fireball that we rode was moving – But now we've got a new machine – They got music in the solar
              system
            </p>
            <a
              href="#"
              class={
                'section__button mt-8 inline-block rounded-full border-2 ' +
                'border-current px-6 py-3 font-medium transition hover:bg-white hover:text-black'
              }
            >
              Discover
            </a>
          </section>

          <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
            <span class="section__title-number text-6xl font-bold opacity-60">02</span>
            <h2 class="section__title-text mt-2 text-4xl font-bold">Naos</h2>
            <div class="section__title-arrow mt-4 flex gap-2">
              <span class="block h-1 w-8 bg-current" />
              <span class="block h-1 w-8 bg-current" />
            </div>
            <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">
              Let me take you on a little trip – We're gonna travel faster than light – And you'll go anywhere you want
              to decide
            </p>
            <a
              href="#"
              class={
                'section__button mt-8 inline-block rounded-full border-2 ' +
                'border-current px-6 py-3 font-medium transition hover:bg-white hover:text-black'
              }
            >
              Discover
            </a>
          </section>

          <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
            <span class="section__title-number text-6xl font-bold opacity-60">03</span>
            <h2 class="section__title-text mt-2 text-4xl font-bold">Chara</h2>
            <div class="section__title-arrow mt-4 flex gap-2">
              <span class="block h-1 w-8 bg-current" />
              <span class="block h-1 w-8 bg-current" />
            </div>
            <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">
              Close your eyes now – And give in to the night – Soar above the stars – Forget what's behind
            </p>
            <a
              href="#"
              class={
                'section__button mt-8 inline-block rounded-full border-2 ' +
                'border-current px-6 py-3 font-medium transition hover:bg-white hover:text-black'
              }
            >
              Discover
            </a>
          </section>
        </div>

        <div
          class="layout__line fixed left-0 top-0 h-1 w-full origin-left bg-white"
          style={{'transform-origin': 'left'}}
        />
      </div>

      <Show when={!isServer}>
        <Suspense fallback={null}>
          <ScrollStage contentRef={() => contentRef} />
        </Suspense>
      </Show>
    </>
  )
}
