import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import {getPomoIconClass} from '../../design-system/icon-style'
import type {PSceneStyle} from '../../features/focus-room-animation/index'
import * as m from '../../paraglide/messages.js'
import {CLASSES} from './shared'

interface PomodoroSessionProgressProps {
  readonly completedCount: number
  readonly onReset: () => void
  readonly positions: readonly number[]
  readonly sceneStyle?: PSceneStyle
  readonly sessionCount: number
}

export const PomodoroSessionProgress = (props: PomodoroSessionProgressProps) => (
  <div class={CLASSES.pomodoroPanelSessionRow}>
    <div
      aria-label={m.pomodoro_progress({
        completed: props.completedCount,
        total: props.sessionCount,
      })}
      class={CLASSES.pomodoroPanelSessions}
    >
      <For each={props.positions}>
        {(position) => (
          <span
            aria-hidden="true"
            class={CLASSES.pomodoroPanelSession}
            data-complete={position < props.completedCount ? '' : undefined}
          />
        )}
      </For>
    </div>
    <Show when={props.completedCount > 0}>
      <button
        class={CLASSES.pomodoroPanelSessionReset}
        onClick={() => props.onReset()}
        type="button"
      >
        <span
          aria-hidden="true"
          class={cx(getPomoIconClass('i-tabler-refresh', props.sceneStyle), 'size-3.5')}
        />
        {m.pomodoro_reset()}
      </button>
    </Show>
  </div>
)
