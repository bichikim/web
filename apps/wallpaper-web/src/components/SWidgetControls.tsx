import {createSignal, onMount, Show} from 'solid-js'
import type {useWidgetPreview} from '../features/widget-preview'
import type {useCharacterSpeech} from '../features/character-speech'
import {SExpressionMenu} from './SExpressionMenu'
import {SSpeechMenu} from './SSpeechMenu'
import {SWidgetSettings} from './SWidgetSettings'
import {SIcon} from './SIcon'

interface SWidgetControlsProps {
  /** Widget operations exposed by the interactive playground. */
  readonly preview: ReturnType<typeof useWidgetPreview>
  /** Speech playback owned by the playground. */
  readonly speech: ReturnType<typeof useCharacterSpeech>
  /** Lock all controls while the scroll story owns the character. */
  readonly hidden?: boolean
}

export const SWidgetControls = (props: SWidgetControlsProps) => {
  const [hydrated, setHydrated] = createSignal(false)
  onMount(() => setHydrated(true))
  return (
    <>
      <nav
        aria-label="체험 도구"
        aria-hidden={props.hidden === true}
        inert={props.hidden === true}
        class="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 flex
          max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center
          gap-[clamp(0.125rem,calc((100vw_-_16rem)/16),0.375rem)] rounded-full
          border border-solid border-white/80 bg-white/90 p-[clamp(0.375rem,2vw,0.5rem)]
          text-ink shadow-[0_8px_30px_-12px_#35244745]
          [--control-size:clamp(2.25rem,12vw,2.75rem)] sm:gap-2.5"
        classList={{'invisible pointer-events-none': props.hidden === true}}
      >
        <Show when={props.preview.actionLabel()}>
          <button
            type="button"
            onClick={() => props.preview.activate()}
            aria-label={props.preview.actionLabel() ?? undefined}
            title={props.preview.actionLabel() ?? undefined}
            class="flex h-[var(--control-size)] w-[var(--control-size)] shrink-0 items-center justify-center
              rounded-full border-0 bg-ink text-white hover:bg-violet"
          >
            <SIcon
              name={props.preview.phase() === 'ready' && props.preview.playing() ? 'pause' : 'play'}
              class="h-5.5 w-5.5"
            />
          </button>
        </Show>
        <button
          type="button"
          onClick={() => props.preview.toggleWalking()}
          disabled={!hydrated()}
          aria-label="걷기"
          aria-pressed={props.preview.walking()}
          title="걷기"
          class="flex h-[var(--control-size)] w-[var(--control-size)] shrink-0 items-center justify-center
            rounded-full border-0 bg-transparent hover:bg-lilac disabled:opacity-60"
          classList={{'bg-lilac! text-violet': props.preview.walking()}}
        >
          <SIcon name="walk" class="h-6 w-6" />
        </button>
        <SExpressionMenu preview={props.preview} />
        <SSpeechMenu speech={props.speech} ready={props.preview.phase() === 'ready'} />
        <button
          type="button"
          onClick={() => props.preview.resetPosition()}
          aria-label="위치 초기화"
          title="위치 초기화"
          class="flex h-[var(--control-size)] w-[var(--control-size)] shrink-0 items-center justify-center
            rounded-full border-0 bg-transparent hover:bg-lilac"
        >
          <SIcon name="reset" />
        </button>
        <span aria-hidden="true" class="mx-0.5 h-5 w-px shrink-0 bg-ink/10" />
        <button
          type="button"
          popovertarget="widget-settings"
          aria-label="설정 열기"
          title="설정"
          class="flex h-[var(--control-size)] w-[var(--control-size)] shrink-0 items-center justify-center
            rounded-full border-0 bg-transparent hover:bg-lilac"
        >
          <SIcon name="settings" />
        </button>
      </nav>
      <div inert={props.hidden === true}>
        <SWidgetSettings preview={props.preview} />
      </div>
    </>
  )
}
