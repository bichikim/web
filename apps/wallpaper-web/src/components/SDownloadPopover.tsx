import {For, Show} from 'solid-js'
import {DOWNLOADS} from '../content/downloads'
import {SIcon} from './SIcon'

export const SDownloadPopover = () => (
  <section
    id="app-download"
    popover="auto"
    role="dialog"
    aria-labelledby="download-heading"
    class="fixed bottom-auto left-auto right-4 top-20 m-0 w-[min(23rem,calc(100vw-2rem))] rounded-5
      border border-solid border-ink/10 bg-[#fcfbff] p-6 text-ink
      shadow-[0_16px_60px_-16px_#35244740] sm:right-7"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 id="download-heading" class="text-sm font-650">
          Poffo Wallpaper 다운로드
        </h2>
        <p class="mt-2 text-xs leading-6 text-muted">데스크톱 앱 설치 파일을 준비하고 있어요.</p>
      </div>
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
    <div class="mt-5 grid gap-3">
      <For each={DOWNLOADS}>
        {(download) => (
          <Show
            when={download.href}
            fallback={
              <div
                class="flex min-h-15 items-center justify-between rounded-3 border border-solid border-ink/10 px-4
                text-xs"
              >
                <span class="font-550">{download.platform}</span>
                <span class="text-[11px] text-muted">준비 중</span>
              </div>
            }
          >
            <a
              href={download.href ?? undefined}
              class="flex min-h-15 items-center justify-between rounded-3 bg-ink px-4 text-xs text-white"
            >
              {download.label}
              <SIcon name="download" />
            </a>
          </Show>
        )}
      </For>
    </div>
    <p class="mt-5 text-[11px] leading-6 text-muted">
      캐릭터 위젯 · 사진과 동영상 앨범 · 웹사이트 배경
    </p>
  </section>
)
