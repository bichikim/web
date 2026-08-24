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

const PHASE_PRESENTATIONS = {
  focus: {
    characterEmotion: 'focus',
    icon: 'i-tabler-focus-2',
    label: '집중',
    startLabel: '집중 시작',
  },
  longBreak: {
    characterEmotion: 'rest',
    icon: 'i-tabler-armchair-2',
    label: '긴 휴식',
    startLabel: '긴 휴식 시작',
  },
  shortBreak: {
    characterEmotion: 'rest',
    icon: 'i-tabler-coffee',
    label: '휴식',
    startLabel: '휴식 시작',
  },
} as const satisfies Record<PomodoroPhase, PhasePresentation>

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
      return state.phase === 'focus' ? '집중 준비' : '휴식 준비'
    case 'paused':
      return '일시정지'
    case 'running':
      return state.phase === 'focus' ? '집중 중' : `${PHASE_PRESENTATIONS[state.phase].label} 중`
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
  const phasePresentation = createMemo(() => PHASE_PRESENTATIONS[timer.state().phase])
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
      return '계속하기'
    }

    return currentState.status === 'running' ? '일시정지' : phasePresentation().startLabel
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
        title="포모도로"
      >
        <section
          aria-label="포모도로 타이머"
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
              accessibleLabel="다음 단계로 이동"
              class={CLASSES.pomodoroPanelCompactAction}
              feedback="다음 단계"
              icon={getPomoIconClass('i-tabler-player-track-next', props.sceneStyle)}
              onPress={timer.onNextPhase}
            />
            <Show when={timer.state().status !== 'idle'}>
              <PIconButton
                accessibleLabel="현재 세션 종료"
                class={cx(
                  CLASSES.pomodoroPanelCompactAction,
                  CLASSES.pomodoroPanelCompactActionDanger,
                )}
                feedback="세션 종료"
                icon={getPomoIconClass('i-tabler-square', props.sceneStyle)}
                onPress={timer.onStop}
              />
            </Show>
          </div>

          <PSwitch
            checked={timer.isAutoStartEnabled()}
            class={CLASSES.pomodoroPanelAutoStart}
            description="타이머가 끝나면 다음 집중 또는 휴식을 바로 시작해요."
            label="집중·휴식 자동 재생"
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
