import {cx} from 'class-variance-authority'
import {type Accessor, createEffect, createMemo, createSignal, Show, untrack} from 'solid-js'

import {getPomoIconClass} from '../icon-style'
import {openDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PButton} from '../p-button/PButton'
import {type PCharacterEmotionType} from '../p-character-emotion/PCharacterEmotion'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {PModal} from '../p-modal/PModal'
import {PSwitch} from '../p-switch/PSwitch'
import type {PSceneStyle} from '../../features/focus-room-animation'
import {
  formatPomodoroTime,
  type PomodoroPhase,
  type PomodoroTimerEvent,
  type PomodoroTimerState,
  usePomodoroTimer,
} from '../../features/pomodoro-timer'
import * as m from '@paraglide/message'
import breakStatusIcon from '../assets/pomodoro-status-icons/break.webp'
import focusStatusIcon from '../assets/pomodoro-status-icons/focus.webp'
import scribbleBreakStatusIcon from '../assets/pomodoro-status-icons/scribble/break.webp'
import scribbleFocusStatusIcon from '../assets/pomodoro-status-icons/scribble/focus.webp'
import {PomodoroQuickControls} from '../pomodoro/QuickControls'
import {PomodoroSessionProgress} from '../pomodoro/SessionProgress'
import {PomodoroTimerRing} from '../pomodoro/TimerRing'
import {CLASSES} from '../pomodoro/shared'
import {PPomodoroDurationEditor} from '../p-pomodoro-duration-editor/PPomodoroDurationEditor'

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
  readonly desktopDialog?: boolean
  readonly desktopSurface?: boolean
  readonly stopOnUnmount?: boolean
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

interface PomodoroPanelProps {
  readonly actionContainer: (element: HTMLDivElement) => void
  readonly completedInCycle: Accessor<number>
  readonly isEditingDurations: Accessor<boolean>
  readonly onEditingDurationsChange: (isEditing: boolean) => void
  readonly phasePresentation: Accessor<PhasePresentation>
  readonly primaryIcon: Accessor<string>
  readonly primaryLabel: Accessor<string>
  readonly progressDegrees: Accessor<string>
  readonly sceneStyle?: PSceneStyle
  readonly statusLabel: Accessor<string>
  readonly timeLabel: Accessor<string>
  readonly timer: ReturnType<typeof usePomodoroTimer>
}

const PomodoroPanel = (props: PomodoroPanelProps) => (
  <section
    aria-label={m.pomodoro_timer_label()}
    class={CLASSES.pomodoroPanel}
    data-phase={props.timer.state().phase}
  >
    <Show when={!props.isEditingDurations()}>
      <PomodoroTimerRing
        icon={getPomoIconClass(props.phasePresentation().icon, props.sceneStyle)}
        label={props.phasePresentation().label}
        progress={props.progressDegrees()}
        timeLabel={props.timeLabel()}
      />

      <PomodoroSessionProgress
        completedCount={props.completedInCycle()}
        onReset={props.timer.onReset}
        positions={Array.from(
          {length: props.timer.config().focusSessionsPerCycle},
          (_, position) => position,
        )}
        sceneStyle={props.sceneStyle}
        sessionCount={props.timer.config().focusSessionsPerCycle}
      />
    </Show>

    <p aria-live="polite" class="sr-only">
      {props.phasePresentation().label}, {props.statusLabel()}
    </p>

    <div class={CLASSES.pomodoroPanelActions} ref={props.actionContainer}>
      <PButton
        raised
        class={CLASSES.pomodoroPanelPrimaryAction}
        icon={props.primaryIcon()}
        onPress={() => {
          if (props.timer.state().status === 'running') {
            props.timer.onPause()
            return
          }

          props.timer.onStart()
        }}
        tone="primary"
      >
        {props.primaryLabel()}
      </PButton>
      <PButton
        {...GLASS_ICON_BUTTON}
        accessibleLabel={m.pomodoro_next_phase()}
        tooltip={m.pomodoro_next_phase()}
        class={CLASSES.pomodoroPanelCompactAction}
        icon={getPomoIconClass('i-tabler-player-track-next', props.sceneStyle)}
        onPress={props.timer.onNextPhase}
      />
      <Show when={props.timer.state().status !== 'idle'}>
        <PButton
          {...GLASS_ICON_BUTTON}
          accessibleLabel={m.pomodoro_end_session()}
          tooltip={m.pomodoro_end_session()}
          class={CLASSES.pomodoroPanelCompactActionDanger}
          icon={getPomoIconClass('i-tabler-square', props.sceneStyle)}
          onPress={props.timer.onStop}
        />
      </Show>
    </div>

    <PSwitch
      checked={props.timer.isAutoStartEnabled()}
      class={CLASSES.pomodoroPanelAutoStart}
      description={m.pomodoro_auto_play_description()}
      label={m.pomodoro_auto_play()}
      onChange={props.timer.onAutoStartChange}
    />

    <PPomodoroDurationEditor
      config={props.timer.config()}
      isEditing={props.isEditingDurations()}
      onChange={props.timer.onConfigChange}
      onEditingChange={props.onEditingDurationsChange}
    />
  </section>
)

export const PPomodoro = (props: PPomodoroProps) => {
  const timer = usePomodoroTimer(props)
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

    if (props.desktopSurface) {
      openDesktopDialog('pomodoro').catch((error: unknown) => {
        console.error('Failed to open the desktop Pomodoro dialog.', error)
      })
      return
    }

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

  const panel = () => (
    <PomodoroPanel
      actionContainer={setActionContainer}
      completedInCycle={completedInCycle}
      isEditingDurations={isEditingDurations}
      onEditingDurationsChange={setIsEditingDurations}
      phasePresentation={phasePresentation}
      primaryIcon={primaryIcon}
      primaryLabel={primaryLabel}
      progressDegrees={progressDegrees}
      sceneStyle={props.sceneStyle}
      statusLabel={statusLabel}
      timeLabel={timeLabel}
      timer={timer}
    />
  )

  return (
    <>
      <Show when={!props.desktopDialog}>
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
      </Show>

      <Show
        fallback={
          <PModal
            getInitialFocus={getInitialFocus}
            headerMode="closeOnly"
            isOpen={isOpen()}
            onCloseAutoFocus={handleCloseAutoFocus}
            onOpenChange={handleOpenChange}
            title={m.pomodoro_title()}
          >
            {panel()}
          </PModal>
        }
        when={props.desktopDialog}
      >
        {panel()}
      </Show>
    </>
  )
}
