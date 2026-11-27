import {createSignal, For, Show} from 'solid-js'
import {fetchReleaseDownloads, type ReleaseDownloads} from '../content/downloads'
import {SIcon} from './SIcon'

export const SDownloadPopover = () => {
  const [release, setRelease] = createSignal<ReleaseDownloads | null>(null)
  const [loading, setLoading] = createSignal(false)
  const refresh = async () => {
    if (loading()) {
      return
    }
    setLoading(true)
    setRelease(await fetchReleaseDownloads())
    setLoading(false)
  }

  return (
    <section
      id="app-download"
      popover="auto"
      role="dialog"
      aria-labelledby="download-heading"
      on:toggle={async (event) => {
        if (event.currentTarget.matches(':popover-open')) {
          await refresh()
        }
      }}
      class="fixed bottom-auto left-auto right-4 top-20 m-0 w-[min(23rem,calc(100vw-2rem))] rounded-5
        border border-solid border-ink/10 bg-[#fcfbff] p-6 text-ink
        shadow-[0_16px_60px_-16px_#35244740] sm:right-7"
    >
      <div class="flex items-start justify-between gap-4">
        <h2 id="download-heading" class="text-sm font-650">
          Poffo Wallpaper 다운로드
        </h2>
        <button
          type="button"
          popovertarget="app-download"
          popovertargetaction="hide"
          aria-label="다운로드 닫기"
          autofocus
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent
            hover:bg-ink/5"
        >
          <SIcon name="close" />
        </button>
      </div>
      <Show
        when={release()}
        fallback={
          <p role="status" class="mt-2 text-xs leading-6 text-muted">
            {loading() ? '다운로드 확인 중' : '현재 받을 수 있는 설치 파일이 없어요.'}
          </p>
        }
      >
        {(downloads) => (
          <div class="mt-5 grid gap-3">
            <For each={downloads().files}>
              {(download) => (
                <a
                  href={download.href}
                  class="flex min-h-15 items-center justify-between gap-3 rounded-3 bg-ink px-4 text-xs
                    text-white"
                >
                  <span class="grid gap-1">
                    <span class="font-550">{download.platform}</span>
                    <span class="text-[11px] text-white/75">v{downloads().version}</span>
                  </span>
                  <span class="flex shrink-0 items-center gap-2">
                    {download.megabytes} MB
                    <SIcon name="download" />
                  </span>
                </a>
              )}
            </For>
          </div>
        )}
      </Show>
    </section>
  )
}
