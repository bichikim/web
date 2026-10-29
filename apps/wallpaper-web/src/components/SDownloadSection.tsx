import {For, Show} from 'solid-js'
import {DOWNLOADS} from '../content/downloads'
import {SIcon} from './SIcon'

export const SDownloadSection = () => (
  <section id="download" aria-labelledby="download-heading" class="page-width py-12 sm:py-20">
    <div
      class="grid gap-10 rounded-8 bg-lilac px-7 py-12 sm:px-14 sm:py-16 md:grid-cols-[1.3fr_1fr]
      md:items-center"
    >
      <div>
        <p class="section-label">POFFO WALLPAPER</p>
        <h2
          id="download-heading"
          class="mt-4 text-[clamp(2.3rem,4vw,3.8rem)] font-600 leading-[1.18] tracking-[-0.06em]"
        >
          Poffo Wallpaper
          <br />
          다운로드
        </h2>
        <p class="mt-5 text-sm leading-7 text-muted">
          macOS · Windows용 설치 파일을 준비하고 있어요.
        </p>
      </div>
      <div class="grid gap-3">
        <For each={DOWNLOADS}>
          {(download) => (
            <Show
              when={download.href}
              fallback={
                <div
                  class="flex items-center justify-between gap-4 rounded-4 border border-solid
                  border-ink/15 px-5 py-5"
                >
                  <span class="flex items-center gap-3 text-sm font-600">
                    <SIcon name={download.platform === 'macOS' ? 'monitor' : 'grid'} />
                    {download.platform}
                  </span>
                  <span class="text-xs text-muted">준비 중</span>
                </div>
              }
            >
              <a
                href={download.href ?? undefined}
                class="flex min-h-16 items-center justify-between rounded-4 bg-ink px-5 text-sm font-600 text-white
                  hover:bg-violet"
              >
                {download.label}
                <SIcon name="download" />
              </a>
            </Show>
          )}
        </For>
      </div>
    </div>
  </section>
)
