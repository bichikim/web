import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'

import breakStatusIcon from '../../assets/pomodoro-status-icons/break-face.png'
import focusStatusIcon from '../../assets/pomodoro-status-icons/focus-face.png'
import {FocusRoomButton} from '../design-system/FocusRoomButton'
import {
  FocusRoomCharacterEmotion,
  type FocusRoomCharacterEmotionType,
} from '../design-system/FocusRoomCharacterEmotion'
import {FocusRoomIconButton} from '../design-system/FocusRoomIconButton'
import {FocusRoomModal} from '../design-system/FocusRoomModal'
import {
  formatPomodoroTime,
  type PomodoroPhase,
  type PomodoroTimerState,
  usePomodoroTimer,
} from '../features/pomodoro-timer'
import './FocusRoomPomodoro.css'
import {FocusRoomPomodoroDurationEditor} from './FocusRoomPomodoroDurationEditor'

interface PhasePresentation {
  readonly characterEmotion: FocusRoomCharacterEmotionType
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
export interface FocusRoomPomodoroProps {
  readonly onOpenChange?: (isOpen: boolean) => void
}

interface PomodoroSessionProgressProps {
  readonly completedCount: number
  readonly onReset: () => void
  readonly positions: readonly number[]
  readonly sessionCount: number
}

const PomodoroSessionProgress = (props: PomodoroSessionProgressProps) => (
  <div class="focus-room-pomodoro-panel__session-row">
    <div
      aria-label={`${props.sessionCount}회 중 ${props.completedCount}회 집중 완료`}
      class="focus-room-pomodoro-panel__sessions"
    >
      <For each={props.positions}>
        {(position) => (
          <span
            aria-hidden="true"
            class="focus-room-pomodoro-panel__session"
            data-complete={position < props.completedCount ? '' : undefined}
          />
        )}
      </For>
    </div>
    <Show when={props.completedCount > 0}>
      <button
        class="focus-room-pomodoro-panel__session-reset"
        onClick={() => props.onReset()}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-refresh size-3.5" />
        세션 초기화
      </button>
    </Show>
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

export const FocusRoomPomodoro = (props: FocusRoomPomodoroProps) => {
  const timer = usePomodoroTimer()
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
    props.onOpenChange?.(nextOpen)
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

  return (
    <>
      <div class="focus-room-pomodoro">
        <button
          aria-haspopup="dialog"
          aria-label={`포모도로 열기, ${statusLabel()}, ${timeLabel()}`}
          class="focus-room-backdrop focus-room-interactive-glass focus-room-pomodoro__trigger"
          data-phase={timer.state().phase}
          onClick={(event) => handleOpen(event.currentTarget)}
          type="button"
        >
          <FocusRoomCharacterEmotion
            active={timer.state().status === 'running'}
            emotion={phasePresentation().characterEmotion}
            image={phasePresentation().characterImage}
          />
          <span class="focus-room-pomodoro__trigger-time">{timeLabel()}</span>
        </button>
      </div>

      <FocusRoomModal
        getInitialFocus={getInitialFocus}
        headerMode="closeOnly"
        isOpen={isOpen()}
        onCloseAutoFocus={handleCloseAutoFocus}
        onOpenChange={handleOpenChange}
        title="포모도로"
      >
        <section
          aria-label="포모도로 타이머"
          class="focus-room-pomodoro-panel"
          data-phase={timer.state().phase}
        >
          <Show when={!isEditingDurations()}>
            <div
              class="focus-room-pomodoro-panel__ring"
              style={{'--focus-room-timer-progress': progressDegrees()}}
            >
              <div class="focus-room-pomodoro-panel__dial">
                <div class="focus-room-pomodoro-panel__phase">
                  <span aria-hidden="true" class={cx(phasePresentation().icon, 'size-4')} />
                  <span>{phasePresentation().label}</span>
                </div>
                <strong class="focus-room-pomodoro-panel__time">{timeLabel()}</strong>
              </div>
            </div>

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

          <div class="focus-room-pomodoro-panel__actions" ref={setActionContainer}>
            <FocusRoomButton
              class="focus-room-pomodoro-panel__primary-action"
              icon={primaryIcon()}
              onPress={handlePrimaryPress}
              tone="primary"
            >
              {primaryLabel()}
            </FocusRoomButton>
            <FocusRoomIconButton
              accessibleLabel="다음 단계로 이동"
              class="focus-room-pomodoro-panel__compact-action"
              feedback="다음 단계"
              icon="i-tabler-player-track-next"
              onPress={timer.onNextPhase}
            />
            <Show when={timer.state().status !== 'idle'}>
              <FocusRoomIconButton
                accessibleLabel="현재 세션 종료"
                class="focus-room-pomodoro-panel__compact-action focus-room-pomodoro-panel__compact-action--danger"
                feedback="세션 종료"
                icon="i-tabler-square"
                onPress={timer.onStop}
              />
            </Show>
          </div>

          <FocusRoomPomodoroDurationEditor
            config={timer.config()}
            isEditing={isEditingDurations()}
            onChange={timer.onConfigChange}
            onEditingChange={setIsEditingDurations}
          />
        </section>
      </FocusRoomModal>
    </>
  )
}
