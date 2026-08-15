import {cx} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, For, Show, untrack} from 'solid-js'

import breakStatusIcon from '../../assets/pomodoro-status-icons/break-face.webp'
import focusStatusIcon from '../../assets/pomodoro-status-icons/focus-face.webp'
import {PButton} from '../design-system/PButton'
import {PCharacterEmotion, type PCharacterEmotionType} from '../design-system/PCharacterEmotion'
import {PIconButton} from '../design-system/PIconButton'
import {PModal} from '../design-system/PModal'
import {PSwitch} from '../design-system/PSwitch'
import {
  formatPomodoroTime,
  type PomodoroPhase,
  type PomodoroTimerEvent,
  type PomodoroTimerState,
  usePomodoroTimer,
} from '../features/pomodoro-timer'
import {PPomodoroDurationEditor} from './PPomodoroDurationEditor'

interface PhasePresentation {
  readonly characterEmotion: PCharacterEmotionType
  readonly characterImage: string
  readonly icon: string
  readonly label: string
  readonly startLabel: string
}

const PHASE_PRESENTATIONS = {
  focus: {
    characterEmotion: 'focus',
    characterImage: focusStatusIcon,
    icon: 'i-tabler-focus-2',
    label: '집중',
    startLabel: '집중 시작',
  },
  longBreak: {
    characterEmotion: 'rest',
    characterImage: breakStatusIcon,
    icon: 'i-tabler-armchair-2',
    label: '긴 휴식',
    startLabel: '긴 휴식 시작',
  },
  shortBreak: {
    characterEmotion: 'rest',
    characterImage: breakStatusIcon,
    icon: 'i-tabler-coffee',
    label: '휴식',
    startLabel: '휴식 시작',
  },
} as const satisfies Record<PomodoroPhase, PhasePresentation>
const DEGREES_PER_CIRCLE = 360

interface PomodoroSessionProgressProps {
  readonly completedCount: number
  readonly onReset: () => void
  readonly positions: readonly number[]
  readonly sessionCount: number
}

export interface PPomodoroProps {
  readonly onEvents?: (events: ReadonlyArray<PomodoroTimerEvent>) => void
  readonly onPresentationChange?: (presentation: PPomodoroPresentation) => void
}

export interface PPomodoroPresentation {
  readonly phaseLabel: string
  readonly statusLabel: string
  readonly timeLabel: string
}

interface PomodoroQuickControlsProps {
  readonly characterEmotion: PCharacterEmotionType
  readonly characterImage: string
  readonly isActive: boolean
  readonly onOpen: (source: HTMLButtonElement) => void
  readonly onPrimaryPress: () => void
  readonly phase: PomodoroPhase
  readonly primaryIcon: string
  readonly primaryLabel: string
  readonly statusLabel: string
  readonly timeLabel: string
}

const PomodoroQuickControls = (props: PomodoroQuickControlsProps) => (
  <div
    aria-label="포모도로 간편 조작"
    class="pomo-backdrop pomo-interactive-glass-group pomo-pomodoro__trigger"
    data-phase={props.phase}
    role="group"
  >
    <button
      aria-label={props.primaryLabel}
      class="pomo-interactive-glass-part pomo-strong-focus-ring pomo-pomodoro__emotion-action"
      onClick={() => props.onPrimaryPress()}
      type="button"
    >
      <PCharacterEmotion
        active={props.isActive}
        emotion={props.characterEmotion}
        image={props.characterImage}
      />
      <span aria-hidden="true" class="pomo-pomodoro__action-indicator">
        <span class={cx(props.primaryIcon, 'pomo-pomodoro__action-icon')} />
      </span>
    </button>
    <button
      aria-haspopup="dialog"
      aria-label={`포모도로 열기, ${props.statusLabel}, ${props.timeLabel}`}
      class={cx(
        'pomo-interactive-glass-group-trigger',
        'pomo-interactive-glass-part pomo-strong-focus-ring pomo-pomodoro__time-action',
      )}
      onClick={(event) => props.onOpen(event.currentTarget)}
      type="button"
    >
      <span class="pomo-pomodoro__trigger-time">{props.timeLabel}</span>
    </button>
  </div>
)

const PomodoroSessionProgress = (props: PomodoroSessionProgressProps) => (
  <div class="pomo-pomodoro-panel__session-row">
    <div
      aria-label={`${props.sessionCount}회 중 ${props.completedCount}회 집중 완료`}
      class="pomo-pomodoro-panel__sessions"
    >
      <For each={props.positions}>
        {(position) => (
          <span
            aria-hidden="true"
            class="pomo-pomodoro-panel__session"
            data-complete={position < props.completedCount ? '' : undefined}
          />
        )}
      </For>
    </div>
    <Show when={props.completedCount > 0}>
      <button
        class="pomo-pomodoro-panel__session-reset"
        onClick={() => props.onReset()}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-refresh size-3.5" />
        세션 초기화
      </button>
    </Show>
  </div>
)

interface PomodoroTimerRingProps {
  readonly icon: string
  readonly label: string
  readonly progress: string
  readonly timeLabel: string
}

const PomodoroTimerRing = (props: PomodoroTimerRingProps) => (
  <div
    class={
      'grid size-[clamp(8.5rem,min(52vw,calc(100dvh-21rem)),14rem)] box-border ' +
      'rounded-full ' +
      'bg-[conic-gradient(var(--pomo-timer-phase)_var(--pomo-timer-progress),rgb(255_250_241_/_10%)_0)] ' +
      'p-2 ' +
      'shadow-[0_18px_48px_rgb(0_0_0_/_28%),inset_0_1px_0_rgb(255_255_255_/_10%)]'
    }
    data-pomo-timer-ring=""
    style={{'--pomo-timer-progress': props.progress}}
  >
    <div
      class={
        'relative flex size-full flex-col items-center justify-center border border-solid ' +
        'border-[var(--pomo-border)] rounded-full bg-[rgb(12_11_9_/_94%)]'
      }
    >
      <div
        class={
          'absolute top-[clamp(0.625rem,2.25dvh,1.125rem)] inline-flex items-center ' +
          'gap-1.5 rounded-[var(--pomo-radius-control)] ' +
          'bg-[color-mix(in_srgb,var(--pomo-timer-phase)_18%,transparent)] ' +
          'px-3 py-1.5 text-xs font-750 leading-4 text-[var(--pomo-text)]'
        }
      >
        <span aria-hidden="true" class={cx(props.icon, 'size-4 text-[var(--pomo-timer-phase)]')} />
        <span>{props.label}</span>
      </div>
      <strong
        class={
          'text-[clamp(2rem,min(11vw,8dvh),3.5rem)] font-800 leading-none ' +
          'tracking--0.04em text-[var(--pomo-text)] [font-variant-numeric:tabular-nums]'
        }
      >
        {props.timeLabel}
      </strong>
    </div>
  </div>
)

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
  const primaryIcon = createMemo(() =>
    timer.state().status === 'running' ? 'i-tabler-player-pause' : 'i-tabler-player-play',
  )
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
      <div class="pomo-pomodoro">
        <PomodoroQuickControls
          characterEmotion={phasePresentation().characterEmotion}
          characterImage={phasePresentation().characterImage}
          isActive={timer.state().status === 'running'}
          onOpen={handleOpen}
          onPrimaryPress={handlePrimaryPress}
          phase={timer.state().phase}
          primaryIcon={primaryIcon()}
          primaryLabel={primaryLabel()}
          statusLabel={statusLabel()}
          timeLabel={timeLabel()}
        />
      </div>

      <PModal
        contentOverflow={isEditingDurations() ? 'auto' : 'hidden'}
        getInitialFocus={getInitialFocus}
        headerMode="closeOnly"
        isOpen={isOpen()}
        onCloseAutoFocus={handleCloseAutoFocus}
        onOpenChange={handleOpenChange}
        title="포모도로"
      >
        <section
          aria-label="포모도로 타이머"
          class="pomo-pomodoro-panel"
          data-phase={timer.state().phase}
        >
          <Show when={!isEditingDurations()}>
            <PomodoroTimerRing
              icon={phasePresentation().icon}
              label={phasePresentation().label}
              progress={progressDegrees()}
              timeLabel={timeLabel()}
            />

            <PomodoroSessionProgress
              completedCount={completedInCycle()}
              onReset={timer.onReset}
              positions={sessionPositions()}
              sessionCount={timer.config().focusSessionsPerCycle}
            />
          </Show>

          <p aria-live="polite" class="sr-only">
            {phasePresentation().label}, {statusLabel()}
          </p>

          <div class="pomo-pomodoro-panel__actions" ref={setActionContainer}>
            <PButton
              class="pomo-pomodoro-panel__primary-action"
              icon={primaryIcon()}
              onPress={handlePrimaryPress}
              tone="primary"
            >
              {primaryLabel()}
            </PButton>
            <PIconButton
              accessibleLabel="다음 단계로 이동"
              class="pomo-pomodoro-panel__compact-action"
              feedback="다음 단계"
              icon="i-tabler-player-track-next"
              onPress={timer.onNextPhase}
            />
            <Show when={timer.state().status !== 'idle'}>
              <PIconButton
                accessibleLabel="현재 세션 종료"
                class="pomo-pomodoro-panel__compact-action pomo-pomodoro-panel__compact-action--danger"
                feedback="세션 종료"
                icon="i-tabler-square"
                onPress={timer.onStop}
              />
            </Show>
          </div>

          <PSwitch
            checked={timer.isAutoStartEnabled()}
            class="pomo-pomodoro-panel__auto-start"
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
