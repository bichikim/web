import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createResource, ErrorBoundary, For, Show, Suspense} from 'solid-js'

import * as m from '@paraglide/message'
import {loadVersionCatalog, type VersionCatalog} from 'src/features/version-catalog'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1',
  'xs:px-8 xs:py-16',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const RELEASE_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_28px_100px_rgba(5,2,10,0.28)] backdrop-blur-xl xs:p-8',
)

const VersionCatalogDocument = (props: {readonly catalog: VersionCatalog}) => (
  <main class={MAIN_CLASSES}>
    <div class={BACKGROUND_CLASSES} />

    <div class="relative mx-auto grid w-full max-w-4xl gap-8">
      <A class="w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white" href="/">
        ← {m.version_catalog_back()}
      </A>

      <header>
        <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">Pomofi</p>
        <h1 class="mb-0 mt-4 text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
          {m.version_notice_title()}
        </h1>
        <p class="mb-0 mt-5 text-sm leading-7 text-#d8cbd9 xs:text-base">
          {m.version_notice_description()}
        </p>
      </header>

      <div class="grid gap-5">
        <For each={props.catalog.releases}>
          {(release) => (
            <article class={RELEASE_CLASSES}>
              <p class="m-0 text-xs font-700 tracking-[0.08em] text-#f2a7b8">{release.version}</p>
              <h2 class="mb-0 mt-2 text-xl font-800 tracking--0.02em xs:text-2xl">
                {release.title}
              </h2>
              <Show when={release.changes.length > 0}>
                <ul class="mb-0 mt-5 grid gap-3 pl-5 text-sm leading-7 text-#d8cbd9 xs:text-base">
                  <For each={release.changes}>{(change) => <li>{change}</li>}</For>
                </ul>
              </Show>
            </article>
          )}
        </For>
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-3 text-xs text-#8f8297">
        <span>© Pomofi</span>
        <A class="font-650 text-#bdb2c4 no-underline hover:text-white" href="/">
          {m.version_catalog_back()} →
        </A>
      </footer>
    </div>
  </main>
)

export default function WhatsNewPage() {
  const [catalog] = createResource(loadVersionCatalog)

  return (
    <ErrorBoundary fallback={<p role="alert">{m.version_catalog_load_error()}</p>}>
      <Suspense fallback={<p role="status">{m.version_catalog_loading()}</p>}>
        <Show keyed when={catalog()}>
          {(data) => <VersionCatalogDocument catalog={data} />}
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}
