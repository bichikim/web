import {cx} from 'class-variance-authority'
import {For} from 'solid-js'

import {getPomoIconClass} from '../design-system/icon-style'
import type {RepeatMode} from '../features/focus-room-audio'
import type {PSceneStyle} from '../features/focus-room-animation'

const CLASSES = {
  playerMode: [
    'pomo-player__mode text-muted-foreground [&:hover]:text-foreground',
    '[&:hover]:bg-secondary-soft [&.is-active]:text-white',
    '[&.is-active]:bg-primary [&.is-active]:shadow-[0_4px_12px_rgb(125_49_29_/_28%)]',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-primary',
    '[&:focus-visible]:[outline-offset:2px]',
  ].join(' '),
  playerModes: 'pomo-player__modes border border-solid border-border bg-surface-overlay',
} as const

const REPEAT_MODES = [
  {icon: 'i-tabler-repeat', label: '전체 반복', value: 'repeat-all'},
  {icon: 'i-tabler-repeat-once', label: '한 곡 반복', value: 'repeat-one'},
] as const

export interface PPlaybackModesProps {
  readonly onRepeatModeChange: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly onShuffleChange: () => void
  readonly repeatMode: RepeatMode
  readonly sceneStyle?: PSceneStyle
  readonly shuffleEnabled: boolean
}

export const PPlaybackModes = (props: PPlaybackModesProps) => (
  <div class={cx(CLASSES.playerModes, 'flex w-fit items-center gap-0.5 rounded-full p-1')}>
    <div class="contents" role="group" aria-label="반복 방식">
      <For each={REPEAT_MODES}>
        {(mode) => (
          <button
            aria-label={mode.label}
            aria-pressed={props.repeatMode === mode.value}
            class={cx(
              CLASSES.playerMode,
              'grid size-8 place-items-center rounded-full transition player-compact:size-7',
              props.repeatMode === mode.value && 'is-active',
            )}
            onClick={() => props.onRepeatModeChange(mode.value)}
            title={mode.label}
            type="button"
          >
            <span
              aria-hidden="true"
              class={cx(getPomoIconClass(mode.icon, props.sceneStyle), 'size-4')}
            />
          </button>
        )}
      </For>
    </div>
    <span aria-hidden="true" class="mx-0.5 h-5 w-px bg-border" />
    <button
      aria-label="랜덤 재생"
      aria-pressed={props.shuffleEnabled}
      class={cx(
        CLASSES.playerMode,
        'grid size-8 place-items-center rounded-full transition player-compact:size-7',
        props.shuffleEnabled && 'is-active',
      )}
      onClick={() => props.onShuffleChange()}
      title="랜덤 재생"
      type="button"
    >
      <span
        aria-hidden="true"
        class={cx(getPomoIconClass('i-tabler-arrows-shuffle', props.sceneStyle), 'size-4')}
      />
    </button>
  </div>
)
