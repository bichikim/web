import {createEffect, createMemo, createSignal, on, onMount, Show} from 'solid-js'
import {useWidgetPreview} from '../features/widget-preview'
import {useCharacterSpeech} from '../features/character-speech'
import {SCharacterWidget} from './SCharacterWidget'
import {SPlaygroundBackdrop} from './SPlaygroundBackdrop'
import {SDownloadPopover} from './SDownloadPopover'
import {SIcon} from './SIcon'
import {SPlaygroundHeader} from './SPlaygroundHeader'
import {SWidgetControls} from './SWidgetControls'
import {useDesktopStory} from '../features/desktop-story/use-desktop-story'
import {resolveCharacterPresentation} from '../features/desktop-story/resolve-character-presentation'
import {useStoryNarration} from '../features/desktop-story/use-story-narration'
import {SDesktopStory} from './SDesktopStory'
import {SStoryTransition} from './SStoryTransition'
import {SStoryMask} from './SStoryMask'
import {SStoryDesktop} from './SStoryDesktop'

export const SWidgetPlayground = () => {
  const preview = useWidgetPreview()
  const speech = useCharacterSpeech()
  const [runway, setRunway] = createSignal<HTMLElement | null>(null)
  const [stage, setStage] = createSignal<HTMLDivElement | null>(null)
  const story = useDesktopStory({dragging: preview.dragging, onRequest: speech.unlock, stage})
  const introductionActive = createMemo(() => story.frame().active)
  useStoryNarration({frame: story.frame, ready: () => preview.phase() === 'ready', speech})
  const presentation = createMemo(() =>
    resolveCharacterPresentation({
      frame: story.frame(),
      preview: {
        ...preview.position(),
        expressionId: preview.expressionId(),
        motionId: preview.motionId(),
        playing: preview.playing(),
        scale: preview.scale(),
      },
    }),
  )
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
      <div
        ref={setStage}
        class="fixed inset-0 isolate h-[100dvh] overflow-hidden"
        style={{
          '--story-aspect': story.aspectRatio(),
          '--story-width': `${story.viewportWidth()}px`,
        }}
      >
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
          playing={!story.frame().transitioning}
          prepareStreet={story.frame().active && !story.frame().transitioning}
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
        <SStoryDesktop
          frame={story.scenes().incoming}
          previousFrame={story.scenes().outgoing}
          transition={story.scenes().transition}
        />
        <SCharacterWidget
          preview={preview}
          mouth={speech.mouth()}
          speaking={speech.status().phase === 'playing'}
          presentation={presentation()}
        />
        <SPlaygroundHeader inert={story.frame().transitioning} />
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
