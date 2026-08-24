import {cx} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, Show, untrack} from 'solid-js'

import {getPomoIconClass} from '../design-system/icon-style'
import {PButton} from '../design-system/PButton'
import {type PCharacterEmotionType} from '../design-system/PCharacterEmotion'
import {PIconButton} from '../design-system/PIconButton'
import {PModal} from '../design-system/PModal'
import {PSwitch} from '../design-system/PSwitch'
import type {PSceneStyle} from '../features/focus-room-animation'
import {
  formatPomodoroTime,
  type PomodoroPhase,
  type PomodoroTimerEvent,
  type PomodoroTimerState,
  usePomodoroTimer,
} from '../features/pomodoro-timer'
import * as m from '../paraglide/messages.js'
import breakStatusIcon from './assets/pomodoro-status-icons/break.webp'
import focusStatusIcon from './assets/pomodoro-status-icons/focus.webp'
import scribbleBreakStatusIcon from './assets/pomodoro-status-icons/scribble/break.webp'
import scribbleFocusStatusIcon from './assets/pomodoro-status-icons/scribble/focus.webp'
import {PomodoroQuickControls} from './pomodoro/QuickControls'
import {PomodoroSessionProgress} from './pomodoro/SessionProgress'
import {PomodoroTimerRing} from './pomodoro/TimerRing'
import {CLASSES} from './pomodoro/shared'
import {PPomodoroDurationEditor} from './PPomodoroDurationEditor'

interface PhasePresentation {
  readonly characterEmotion: PCharacterEmotionType
  readonly icon: string
  readonly label: string
  readonly startLabel: string
}

const getPhasePresentation = (phase: PomodoroPhase): PhasePresentation => {
  switch (phase) {
    case 'focus':
      return {
        characterEmotion: 'focus',
        icon: 'i-tabler-focus-2',
        label: m.pomodoro_focus(),
        startLabel: m.pomodoro_focus_start(),
      }
    case 'longBreak':
      return {
        characterEmotion: 'rest',
        icon: 'i-tabler-armchair-2',
        label: m.pomodoro_long_break(),
        startLabel: m.pomodoro_long_break_start(),
      }
    case 'shortBreak':
      return {
        characterEmotion: 'rest',
        icon: 'i-tabler-coffee',
        label: m.pomodoro_break(),
        startLabel: m.pomodoro_break_start(),
      }
  }
}

const CHARACTER_IMAGES = {
  original: {
    focus: focusStatusIcon,
    rest: breakStatusIcon,
  },
  scribble: {
    focus: scribbleFocusStatusIcon,
    rest: scribbleBreakStatusIcon,
  },
} as const satisfies Record<PSceneStyle, Record<PCharacterEmotionType, string>>
const DEGREES_PER_CIRCLE = 360

export interface PPomodoroProps {
  readonly onEvents?: (events: ReadonlyArray<PomodoroTimerEvent>) => void
  readonly onPresentationChange?: (presentation: PPomodoroPresentation) => void
  readonly sceneStyle?: PSceneStyle
}

export interface PPomodoroPresentation {
  readonly phaseLabel: string
  readonly statusLabel: string
  readonly timeLabel: string
}

const getStatusLabel = (state: PomodoroTimerState) => {
  switch (state.status) {
    case 'idle':
      return state.phase === 'focus' ? m.pomodoro_focus_ready() : m.pomodoro_break_ready()
    case 'paused':
      return m.pomodoro_paused()
    case 'running':
      return state.phase === 'focus'
        ? m.pomodoro_focus_running()
        : m.pomodoro_phase_running({phase: getPhasePresentation(state.phase).label})
  }

  const exhaustiveStatus: never = state
  return exhaustiveStatus
}

const getCompletedInCycle = (state: PomodoroTimerState, focusSessionsPerCycle: number) => {
  if (state.phase === 'longBreak') {
    return focusSessionsPerCycle
  }

  return state.completedFocusSessions % focusSessionsPerCycle
}

const getPrimaryIcon = (state: PomodoroTimerState, sceneStyle?: PSceneStyle) =>
  getPomoIconClass(
    state.status === 'running' ? 'i-tabler-player-pause' : 'i-tabler-player-play',
    sceneStyle,
  )

export const PPomodoro = (props: PPomodoroProps) => {
  const timer = usePomodoroTimer({onEvents: (events) => props.onEvents?.(events)})
  const [isOpen, setIsOpen] = createSignal(false)
  const [isEditingDurations, setIsEditingDurations] = createSignal(false)
  const [actionContainer, setActionContainer] = createSignal<HTMLDivElement | null>(null)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const phasePresentation = createMemo(() => getPhasePresentation(timer.state().phase))
  const statusLabel = createMemo(() => getStatusLabel(timer.state()))
  const timeLabel = createMemo(() => formatPomodoroTime(timer.remainingSeconds()))
  const completedInCycle = createMemo(() =>
    getCompletedInCycle(timer.state(), timer.config().focusSessionsPerCycle),
  )
  const sessionPositions = createMemo(() =>
    Array.from({length: timer.config().focusSessionsPerCycle}, (_, position) => position),
  )
  const progressDegrees = createMemo(() => `${timer.progress() * DEGREES_PER_CIRCLE}deg`)
  const primaryLabel = createMemo(() => {
    const currentState = timer.state()

    if (currentState.status === 'paused') {
      return m.pomodoro_continue()
    }

    return currentState.status === 'running' ? m.pomodoro_paused() : phasePresentation().startLabel
  })
  const primaryIcon = createMemo(() => getPrimaryIcon(timer.state(), props.sceneStyle))
  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen)
    if (!nextOpen) {
      setIsEditingDurations(false)
    }
  }
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    handleOpenChange(true)
  }
  const handlePrimaryPress = () => {
    if (timer.state().status === 'running') {
      timer.onPause()
      return
    }

    timer.onStart()
  }
  const handleCloseAutoFocus = () => triggerElement()?.focus()
  const getInitialFocus = () =>
    actionContainer()?.querySelector<HTMLButtonElement>('button') ?? null

  createEffect(() => {
    const presentation = {
      phaseLabel: phasePresentation().label,
      statusLabel: statusLabel(),
      timeLabel: timeLabel(),
    } satisfies PPomodoroPresentation

    untrack(() => props.onPresentationChange)?.(presentation)
  })

  return (
    <>
      <div class={CLASSES.pomodoro}>
        <PomodoroQuickControls
          characterEmotion={phasePresentation().characterEmotion}
          characterImage={
            CHARACTER_IMAGES[props.sceneStyle ?? 'original'][phasePresentation().characterEmotion]
          }
          isActive={timer.state().status === 'running'}
          onOpen={handleOpen}
          onPrimaryPress={handlePrimaryPress}
          phase={timer.state().phase}
          primaryIcon={primaryIcon()}
          primaryLabel={primaryLabel()}
          sceneStyle={props.sceneStyle}
          statusLabel={statusLabel()}
          timeLabel={timeLabel()}
        />
      </div>

      <PModal
        getInitialFocus={getInitialFocus}
        headerMode="closeOnly"
        isOpen={isOpen()}
        onCloseAutoFocus={handleCloseAutoFocus}
        onOpenChange={handleOpenChange}
        title={m.pomodoro_title()}
      >
        <section
          aria-label={m.pomodoro_timer_label()}
          class={CLASSES.pomodoroPanel}
          data-phase={timer.state().phase}
        >
          <Show when={!isEditingDurations()}>
            <PomodoroTimerRing
              icon={getPomoIconClass(phasePresentation().icon, props.sceneStyle)}
              label={phasePresentation().label}
              progress={progressDegrees()}
              timeLabel={timeLabel()}
            />

            <PomodoroSessionProgress
              completedCount={completedInCycle()}
              onReset={timer.onReset}
              positions={sessionPositions()}
              sceneStyle={props.sceneStyle}
              sessionCount={timer.config().focusSessionsPerCycle}
            />
          </Show>

          <p aria-live="polite" class="sr-only">
            {phasePresentation().label}, {statusLabel()}
          </p>

          <div class={CLASSES.pomodoroPanelActions} ref={setActionContainer}>
            <PButton
              class={CLASSES.pomodoroPanelPrimaryAction}
              icon={primaryIcon()}
              onPress={handlePrimaryPress}
              tone="primary"
            >
              {primaryLabel()}
            </PButton>
            <PIconButton
              accessibleLabel={m.pomodoro_next_phase()}
              class={CLASSES.pomodoroPanelCompactAction}
              feedback={m.pomodoro_next_phase_feedback()}
              icon={getPomoIconClass('i-tabler-player-track-next', props.sceneStyle)}
              onPress={timer.onNextPhase}
            />
            <Show when={timer.state().status !== 'idle'}>
              <PIconButton
                accessibleLabel={m.pomodoro_end_session()}
                class={cx(
                  CLASSES.pomodoroPanelCompactAction,
                  CLASSES.pomodoroPanelCompactActionDanger,
                )}
                feedback={m.pomodoro_end_session_feedback()}
                icon={getPomoIconClass('i-tabler-square', props.sceneStyle)}
                onPress={timer.onStop}
              />
            </Show>
          </div>

          <PSwitch
            checked={timer.isAutoStartEnabled()}
            class={CLASSES.pomodoroPanelAutoStart}
            description={m.pomodoro_auto_play_description()}
            label={m.pomodoro_auto_play()}
            onChange={timer.onAutoStartChange}
          />

          <PPomodoroDurationEditor
            config={timer.config()}
            isEditing={isEditingDurations()}
            onChange={timer.onConfigChange}
            onEditingChange={setIsEditingDurations}
          />
        </section>
      </PModal>
    </>
  )
}
