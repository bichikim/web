import {For} from 'solid-js'
import {type useWidgetPreview, WIDGET_BACKGROUNDS} from '../features/widget-preview'
import {SIcon} from './SIcon'

interface SWidgetSettingsProps {
  readonly preview: ReturnType<typeof useWidgetPreview>
}

export const SWidgetSettings = (props: SWidgetSettingsProps) => {
  return (
    <section
      id="widget-settings"
      popover="auto"
      role="dialog"
      aria-labelledby="settings-heading"
      class="fixed bottom-24 left-auto right-4 top-20 m-0 w-[min(23rem,calc(100vw-2rem))]
      max-h-[calc(100dvh-11rem)] overflow-y-auto
      overscroll-contain rounded-5 border border-solid border-ink/10 bg-[#fcfbff]/97 p-0 text-ink
      shadow-[0_16px_60px_-16px_#35244740] backdrop-blur-xl sm:right-7"
    >
      <header
        class="sticky top-0 flex items-center justify-between border-0 border-b border-solid border-ink/8
      bg-[#fcfbff] px-6 py-4"
      >
        <h2 id="settings-heading" class="text-sm font-650">
          설정
        </h2>
        <button
          type="button"
          popovertarget="widget-settings"
          popovertargetaction="hide"
          aria-label="설정 닫기"
          autofocus
          class="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent hover:bg-ink/5"
        >
          <SIcon name="close" />
        </button>
      </header>
      <div class="space-y-7 p-6">
        <fieldset class="m-0 min-w-0 border-0 p-0">
          <legend class="mb-4 text-xs font-650">배경화면</legend>
          <div class="grid grid-cols-2 gap-3">
            <For each={WIDGET_BACKGROUNDS}>
              {(background) => (
                <button
                  type="button"
                  aria-label={`${background.name} 배경 선택`}
                  aria-pressed={props.preview.background() === background.id}
                  onClick={() => props.preview.selectBackground(background.id)}
                  class="overflow-hidden rounded-3 border-2 border-solid border-transparent bg-white p-0 text-left
                  transition hover:border-violet/40"
                  classList={{'border-violet!': props.preview.background() === background.id}}
                >
                  <img
                    src={`/images/backgrounds/${background.id}.webp`}
                    alt=""
                    width="1672"
                    height="941"
                    loading="lazy"
                    class="aspect-video h-auto w-full object-cover"
                  />
                  <span class="flex items-center justify-between px-3 py-2.5 text-[11px]">
                    {background.name}
                    <span
                      aria-hidden="true"
                      classList={{'opacity-0': props.preview.background() !== background.id}}
                    >
                      <SIcon name="check" class="h-4.5 w-4.5 text-violet" />
                    </span>
                  </span>
                </button>
              )}
            </For>
          </div>
        </fieldset>
        <fieldset class="m-0 min-w-0 border-0 border-t border-solid border-ink/10 p-0 pt-6">
          <legend class="text-xs font-650">캐릭터</legend>
          <div class="mt-2 flex items-center gap-3 rounded-3 bg-lilac/60 px-3 py-3">
            <img
              src="/models/white-cat/poster.webp"
              alt=""
              width="32"
              height="40"
              loading="lazy"
              class="h-10 w-8 object-contain"
            />
            <p class="text-xs font-600">예시 캐릭터</p>
          </div>
          <label class="mt-5 block text-xs">
            <span class="flex items-center justify-between">
              크기<span class="font-mono text-[11px] text-muted">{props.preview.size()}%</span>
            </span>
            <input
              type="range"
              min="50"
              max="250"
              aria-label="위젯 크기"
              value={props.preview.size()}
              onInput={(event) => props.preview.resize(event)}
              class="mt-3 h-6 w-full accent-violet"
            />
          </label>
          <button
            type="button"
            onClick={() => props.preview.toggleTracking()}
            aria-pressed={props.preview.tracking()}
            class="mt-4 flex min-h-11 w-full items-center justify-between rounded-3 border border-solid
            border-ink/10 bg-white px-3 text-xs"
          >
            <span>커서 따라보기</span>
            <span class="rounded-full bg-lilac px-2 py-0.5 text-[10px] text-violet">
              {props.preview.tracking() ? '켬' : '끔'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => props.preview.resetPosition()}
            class="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-3 border-0 bg-lilac px-3
            text-xs font-550 text-violet"
          >
            <SIcon name="reset" class="h-5.5 w-5.5" />
            가운데로 이동
          </button>
        </fieldset>
        <div class="border-0 border-t border-solid border-ink/10 pt-5 text-[11px] leading-6 text-muted">
          <p>Home 키로 위치 초기화</p>
        </div>
      </div>
    </section>
  )
}
