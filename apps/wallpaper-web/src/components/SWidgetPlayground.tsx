import {createEffect, createMemo, createSignal, on, onMount, Show} from 'solid-js'
import {useWidgetPreview} from '../features/widget-preview'
import {useCharacterSpeech} from '../features/character-speech'
import {SCharacterWidget} from './SCharacterWidget'
import {SPlaygroundBackdrop} from './SPlaygroundBackdrop'
import {SDownloadPopover} from './SDownloadPopover'
import {SIcon} from './SIcon'
import {SMusicPlayer} from './SMusicPlayer'
import {SWidgetControls} from './SWidgetControls'
import {useDesktopStory} from '../features/desktop-story/use-desktop-story'
import {useStoryNarration} from '../features/desktop-story/use-story-narration'
import {SDesktopStory} from './SDesktopStory'
import {SStoryTransition} from './SStoryTransition'
import {SStoryMask} from './SStoryMask'

export const SWidgetPlayground = () => {
  const preview = useWidgetPreview()
  const speech = useCharacterSpeech()
  const [runway, setRunway] = createSignal<HTMLElement | null>(null)
  const [stage, setStage] = createSignal<HTMLDivElement | null>(null)
  const story = useDesktopStory({onRequest: speech.unlock, stage})
  const introductionActive = createMemo(() => story.frame().active)
  useStoryNarration({frame: story.frame, ready: () => preview.phase() === 'ready', speech})
  const presentation = createMemo(() => {
    const frame = story.frame()
    if (!frame.active) {
      return undefined
    }
    const EASE_SLOPE = 3
    const entrance = frame.entrance * frame.entrance * (EASE_SLOPE - 2 * frame.entrance)
    return {
      ...frame.character,
      expressionId: frame.visible ? frame.character.expressionId : preview.expressionId(),
      motionId: frame.visible ? frame.character.motionId : preview.motionId(),
      playing: frame.visible ? frame.character.playing : preview.playing(),
      scale: preview.scale() * (1 - entrance) + frame.character.scale * entrance,
      x: preview.position().x * (1 - entrance) + frame.character.x * entrance,
      y: preview.position().y * (1 - entrance) + frame.character.y * entrance,
    }
  })
  createEffect(
    on(introductionActive, (active) => {
      if (active) {
        speech.stop()
        runway()
          ?.querySelectorAll<HTMLElement>(':popover-open')
          .forEach((popover) => popover.hidePopover())
      }
    }),
  )
  onMount(preview.activate)
  return (
    <main
      ref={setRunway}
      id="widget"
      aria-label="Poffo Wallpaper 체험"
      class="relative h-[100dvh] overscroll-none bg-lilac"
    >
      <div ref={setStage} class="fixed inset-0 isolate h-[100dvh] overflow-hidden">
        <SPlaygroundBackdrop
          background={
            story.scenes().incoming.visible
              ? story.scenes().incoming.background
              : preview.background()
          }
          previousBackground={
            story.scenes().outgoing?.visible
              ? story.scenes().outgoing?.background
              : preview.background()
          }
          prepareStreet={story.frame().active}
          transition={story.scenes().transition}
        />
        <SStoryMask outgoing transition={story.scenes().transition}>
          <Show when={story.scenes().outgoing} keyed>
            {(frame) => <SDesktopStory animated={false} frame={frame} />}
          </Show>
        </SStoryMask>
        <SStoryMask transition={story.scenes().transition}>
          <SDesktopStory
            animated={story.scenes().transition === null}
            frame={story.scenes().incoming}
            onReturn={story.returnToPlayground}
            speech={speech}
            ready={preview.phase() === 'ready'}
          />
        </SStoryMask>
        <SCharacterWidget
          preview={preview}
          mouth={speech.mouth()}
          speaking={speech.status().phase === 'playing'}
          presentation={presentation()}
        />
        <header
          inert={story.frame().transitioning}
          class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between
          gap-[clamp(0.25rem,1.5vw,0.5rem)] px-[clamp(0.75rem,4vw,1.25rem)] pt-5 sm:px-8 sm:pt-7"
        >
          <h1
            class="flex h-11 shrink-0 items-baseline gap-2.5 rounded-full bg-white/80
            px-[clamp(0.75rem,3vw,1rem)] py-2 shadow-[0_8px_30px_-12px_#35244745] backdrop-blur-md"
          >
            <span class="text-7 font-800 leading-none tracking-[-0.09em]">
              poffo<span class="text-violet">.</span>
            </span>
            <span class="hidden text-[9px] font-600 tracking-[0.08em] text-muted sm:inline">
              WALLPAPER
            </span>
          </h1>
          <div class="flex min-w-0 flex-1 items-center justify-end gap-[clamp(0.25rem,1.5vw,0.5rem)] sm:gap-3">
            <SMusicPlayer />
            <button
              type="button"
              popovertarget="app-download"
              aria-label="다운로드"
              class="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center gap-3 rounded-full
            border-0 bg-ink p-0 text-xs font-550 text-white shadow-[0_8px_30px_-12px_#35244745]
            hover:bg-violet sm:w-auto sm:px-5"
            >
              <span class="hidden sm:inline">다운로드</span>
              <SIcon name="download" class="h-5.5 w-5.5" />
            </button>
          </div>
        </header>
        <p
          class="pointer-events-none absolute bottom-7 left-8 hidden rounded-full bg-white/80 px-3 py-1.5
        text-[10px] text-muted backdrop-blur-md md:block"
          classList={{'hidden!': story.frame().active}}
        >
          예시 캐릭터
        </p>
        <SWidgetControls preview={preview} speech={speech} hidden={story.frame().active} />
        <button
          type="button"
          onClick={story.startIntroduction}
          tabIndex={story.frame().active ? -1 : 0}
          aria-hidden={story.frame().active}
          class="absolute bottom-24 right-4 flex items-center gap-2 rounded-full border-0 bg-white/80
          px-3 py-2 text-[10px] text-muted backdrop-blur-md sm:bottom-7 sm:right-8"
          classList={{'invisible pointer-events-none': story.frame().active}}
        >
          스크롤로 앱 살펴보기 <span aria-hidden="true">↓</span>
        </button>
        <Show when={preview.phase() === 'error'}>
          <p
            role="alert"
            class="absolute bottom-25 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 break-keep
            rounded-full bg-white/95 px-4 py-2 text-center text-xs text-ink"
          >
            캐릭터를 불러오지 못했어요. 다시 시도해 주세요.
          </p>
        </Show>
        <SDownloadPopover />
        <SStoryTransition
          transition={story.transition()}
          onCovered={story.covered}
          onFinished={story.finished}
        />
      </div>
    </main>
  )
}
