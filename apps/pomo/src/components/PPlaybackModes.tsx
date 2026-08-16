import {cx} from 'class-variance-authority'
import {For} from 'solid-js'

import type {RepeatMode} from '../features/focus-room-audio'

const REPEAT_MODES = [
  {icon: 'i-tabler-repeat', label: '전체 반복', value: 'repeat-all'},
  {icon: 'i-tabler-repeat-once', label: '한 곡 반복', value: 'repeat-one'},
] as const

export interface PPlaybackModesProps {
  readonly onRepeatModeChange: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly onShuffleChange: () => void
  readonly repeatMode: RepeatMode
  readonly shuffleEnabled: boolean
}

export const PPlaybackModes = (props: PPlaybackModesProps) => (
  <div class="pomo-player__modes flex w-fit items-center gap-0.5 rounded-full p-[var(--pomo-padding-xs)]">
    <div class="contents" role="group" aria-label="반복 방식">
      <For each={REPEAT_MODES}>
        {(mode) => (
          <button
            aria-label={mode.label}
            aria-pressed={props.repeatMode === mode.value}
            class={cx(
              'pomo-player__mode grid size-8 place-items-center rounded-full transition',
              props.repeatMode === mode.value && 'is-active',
            )}
            onClick={() => props.onRepeatModeChange(mode.value)}
            title={mode.label}
            type="button"
          >
            <span aria-hidden="true" class={cx(mode.icon, 'size-4')} />
          </button>
        )}
      </For>
    </div>
    <span aria-hidden="true" class="mx-0.5 h-5 w-px bg-[var(--pomo-border)]" />
    <button
      aria-label="랜덤 재생"
      aria-pressed={props.shuffleEnabled}
      class={cx(
        'pomo-player__mode grid size-8 place-items-center rounded-full transition',
        props.shuffleEnabled && 'is-active',
      )}
      onClick={() => props.onShuffleChange()}
      title="랜덤 재생"
      type="button"
    >
      <span aria-hidden="true" class="i-tabler-arrows-shuffle size-4" />
    </button>
  </div>
)
