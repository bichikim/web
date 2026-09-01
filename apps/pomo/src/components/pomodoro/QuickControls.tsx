import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {PCharacterEmotion, type PCharacterEmotionType} from '../PCharacterEmotion'
import type {PSceneStyle} from '../../features/focus-room-animation/index'
import {type PomodoroPhase} from '../../features/pomodoro-timer/index'
import * as m from '@paraglide/message'
import {PScribbleCircleFrame} from '../scribble/CircleFrame'
import {PScribbleFrame, SCRIBBLE_MASK_IMAGE} from '../scribble/Frame'
import {CLASSES} from './shared'

interface PomodoroQuickControlsProps {
  readonly characterEmotion: PCharacterEmotionType
  readonly characterImage: string
  readonly isActive: boolean
  readonly onOpen: (source: HTMLButtonElement) => void
  readonly onPrimaryPress: () => void
  readonly phase: PomodoroPhase
  readonly primaryIcon: string
  readonly primaryLabel: string
  readonly sceneStyle?: PSceneStyle
  readonly statusLabel: string
  readonly timeLabel: string
}

const QUICK_CONTROLS_INTERACTION_CLASSES = cx(
  '[&:has([data-glass-part]:hover)]:border-border-hover',
  '[&:has([data-glass-part]:focus-visible)]:border-highlight',
  '[&:has([data-glass-part][data-expanded])]:border-highlight',
  '[&:has([data-glass-trigger]:hover)]:bg-surface-interactive',
  '[&:has([data-glass-trigger]:focus-visible)]:bg-surface-interactive',
  '[&:has([data-glass-trigger][data-expanded])]:bg-surface-interactive',
)

const INTERACTIVE_GLASS_PART_CLASSES = cx(
  '[&:not([data-glass-trigger]):hover]:bg-surface-overlay',
  '[&:not([data-glass-trigger]):focus-visible]:bg-surface-overlay',
  '[&:not([data-glass-trigger])[data-expanded]]:bg-surface-overlay',
)

const STRONG_FOCUS_RING_CLASSES =
  'focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-2 ' +
  'focus-visible:outline-highlight'

const SCRIBBLE_MASK_CLASSES = cx(
  '[mask-image:var(--pomo-pomodoro-scribble-mask)]',
  '[-webkit-mask-image:var(--pomo-pomodoro-scribble-mask)]',
  '[mask-mode:alpha] [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%]',
  '[-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat]',
  '[-webkit-mask-size:100%_100%]',
)

const getQuickFrameClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble'
    ? 'rounded-none border-0 bg-transparent'
    : cx(
        QUICK_CONTROLS_INTERACTION_CLASSES,
        'rounded-control border border-solid border-border bg-surface backdrop-blur-surface',
      )

export const PomodoroQuickControls = (props: PomodoroQuickControlsProps) => (
  <div class="pomo-pomodoro-frame relative inline-flex w-fit overflow-visible">
    <Show when={props.sceneStyle === 'scribble'}>
      <div
        aria-hidden="true"
        class={cx(
          'pomo-pomodoro__scribble-surface pointer-events-none absolute inset-0',
          'bg-surface backdrop-blur-surface',
          SCRIBBLE_MASK_CLASSES,
        )}
        style={{'--pomo-pomodoro-scribble-mask': SCRIBBLE_MASK_IMAGE}}
      />
    </Show>

    <Show when={props.sceneStyle === 'scribble'}>
      <PScribbleFrame class="pomo-pomodoro__scribble-border" />
    </Show>

    <div
      aria-label={m.pomodoro_quick_controls()}
      class={cx(CLASSES.pomodoroTrigger, getQuickFrameClasses(props.sceneStyle))}
      data-phase={props.phase}
      role="group"
    >
      <button
        aria-label={props.primaryLabel}
        class={cx(
          INTERACTIVE_GLASS_PART_CLASSES,
          STRONG_FOCUS_RING_CLASSES,
          CLASSES.pomodoroEmotionAction,
        )}
        data-glass-part=""
        onClick={() => props.onPrimaryPress()}
        type="button"
      >
        <PCharacterEmotion
          active={props.isActive}
          emotion={props.characterEmotion}
          image={props.characterImage}
        />
        <span aria-hidden="true" class={CLASSES.pomodoroActionIndicator}>
          <Show when={props.sceneStyle === 'scribble'}>
            <PScribbleCircleFrame class="pomo-pomodoro__action-scribble-border" />
          </Show>
          <span class={cx(props.primaryIcon, CLASSES.pomodoroActionIcon)} />
        </span>
      </button>
      <button
        aria-haspopup="dialog"
        aria-label={m.pomodoro_open({status: props.statusLabel, time: props.timeLabel})}
        class={cx(
          INTERACTIVE_GLASS_PART_CLASSES,
          STRONG_FOCUS_RING_CLASSES,
          CLASSES.pomodoroTimeAction,
        )}
        data-glass-part=""
        data-glass-trigger=""
        onClick={(event) => props.onOpen(event.currentTarget)}
        type="button"
      >
        <span class={CLASSES.pomodoroTriggerTime}>{props.timeLabel}</span>
      </button>
    </div>
  </div>
)
