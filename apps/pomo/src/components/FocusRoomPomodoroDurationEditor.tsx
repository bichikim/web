import {createMemo, createSignal, Show, untrack} from 'solid-js'

import {FocusRoomButton} from '../design-system/FocusRoomButton'
import type {PomodoroTimerConfig} from '../features/pomodoro-timer'

interface DurationDraft {
  readonly focus: string
  readonly longBreak: string
  readonly sessions: string
  readonly shortBreak: string
}

const MAX_DURATION_MINUTES = 120
const MAX_FOCUS_SESSIONS = 12
const MIN_DURATION_MINUTES = 1
const MIN_FOCUS_SESSIONS = 1
const SECONDS_PER_MINUTE = 60

export interface FocusRoomPomodoroDurationEditorProps {
  readonly config: PomodoroTimerConfig
  readonly isEditing: boolean
  readonly onChange: (config: PomodoroTimerConfig) => void
  readonly onEditingChange: (isEditing: boolean) => void
}

const createDurationDraft = (config: PomodoroTimerConfig): DurationDraft => ({
  focus: String(config.focusSeconds / SECONDS_PER_MINUTE),
  longBreak: String(config.longBreakSeconds / SECONDS_PER_MINUTE),
  sessions: String(config.focusSessionsPerCycle),
  shortBreak: String(config.shortBreakSeconds / SECONDS_PER_MINUTE),
})

const parseDurationMinutes = (value: string) => {
  const minutes = Number(value)

  if (
    !Number.isInteger(minutes) ||
    minutes < MIN_DURATION_MINUTES ||
    minutes > MAX_DURATION_MINUTES
  ) {
    return null
  }

  return minutes
}

export const FocusRoomPomodoroDurationEditor = (props: FocusRoomPomodoroDurationEditorProps) => {
  const [draft, setDraft] = createSignal<DurationDraft>(
    untrack(() => createDurationDraft(props.config)),
  )
  const summary = () =>
    `${props.config.focusSessionsPerCycle}세션 · 집중 ${props.config.focusSeconds / SECONDS_PER_MINUTE}분 · ` +
    `짧은 휴식 ${props.config.shortBreakSeconds / SECONDS_PER_MINUTE}분 · ` +
    `긴 휴식 ${props.config.longBreakSeconds / SECONDS_PER_MINUTE}분`
  const nextConfig = createMemo(() => {
    const durationDraft = draft()
    const focusMinutes = parseDurationMinutes(durationDraft.focus)
    const longBreakMinutes = parseDurationMinutes(durationDraft.longBreak)
    const sessionCount = Number(durationDraft.sessions)
    const shortBreakMinutes = parseDurationMinutes(durationDraft.shortBreak)

    if (
      focusMinutes === null ||
      longBreakMinutes === null ||
      shortBreakMinutes === null ||
      !Number.isInteger(sessionCount) ||
      sessionCount < MIN_FOCUS_SESSIONS ||
      sessionCount > MAX_FOCUS_SESSIONS
    ) {
      return null
    }

    return {
      focusSeconds: focusMinutes * SECONDS_PER_MINUTE,
      focusSessionsPerCycle: sessionCount,
      longBreakSeconds: longBreakMinutes * SECONDS_PER_MINUTE,
      shortBreakSeconds: shortBreakMinutes * SECONDS_PER_MINUTE,
    } satisfies PomodoroTimerConfig
  })
  const handleToggle = () => {
    const nextEditing = !props.isEditing

    if (nextEditing) {
      setDraft(createDurationDraft(props.config))
    }

    props.onEditingChange(nextEditing)
  }
  const handleSave = () => {
    const config = nextConfig()

    if (config === null) {
      return
    }

    props.onChange(config)
    props.onEditingChange(false)
  }

  return (
    <>
      <button
        aria-expanded={props.isEditing}
        class="focus-room-pomodoro-panel__routine"
        onClick={handleToggle}
        type="button"
      >
        <span>{summary()}</span>
        <span aria-hidden="true" class="i-tabler-pencil size-3.5" />
      </button>

      <Show when={props.isEditing}>
        <div class="focus-room-pomodoro-panel__duration-editor">
          <div class="focus-room-pomodoro-panel__duration-fields">
            <DurationField
              accessibleLabel="집중 횟수(회)"
              label="집중 횟수"
              max={MAX_FOCUS_SESSIONS}
              min={MIN_FOCUS_SESSIONS}
              onInput={(value) => setDraft((current) => ({...current, sessions: value}))}
              suffix="회"
              value={draft().sessions}
            />
            <DurationField
              accessibleLabel="집중 시간(분)"
              label="집중"
              max={MAX_DURATION_MINUTES}
              min={MIN_DURATION_MINUTES}
              onInput={(value) => setDraft((current) => ({...current, focus: value}))}
              suffix="분"
              value={draft().focus}
            />
            <DurationField
              accessibleLabel="짧은 휴식 시간(분)"
              label="짧은 휴식"
              max={MAX_DURATION_MINUTES}
              min={MIN_DURATION_MINUTES}
              onInput={(value) => setDraft((current) => ({...current, shortBreak: value}))}
              suffix="분"
              value={draft().shortBreak}
            />
            <DurationField
              accessibleLabel="긴 휴식 시간(분)"
              label="긴 휴식"
              max={MAX_DURATION_MINUTES}
              min={MIN_DURATION_MINUTES}
              onInput={(value) => setDraft((current) => ({...current, longBreak: value}))}
              suffix="분"
              value={draft().longBreak}
            />
          </div>
          <div class="focus-room-pomodoro-panel__duration-actions">
            <FocusRoomButton
              class="w-full"
              disabled={nextConfig() === null}
              icon="i-tabler-check"
              onPress={handleSave}
              size="small"
              tone="secondary"
            >
              설정 저장
            </FocusRoomButton>
            <FocusRoomButton
              class="w-full"
              icon="i-tabler-x"
              onPress={() => props.onEditingChange(false)}
              size="small"
              tone="secondary"
            >
              취소
            </FocusRoomButton>
          </div>
          <p class="focus-room-pomodoro-panel__duration-help">집중 횟수 1~12회 · 시간 1~120분</p>
        </div>
      </Show>
    </>
  )
}

interface DurationFieldProps {
  readonly accessibleLabel: string
  readonly label: string
  readonly max: number
  readonly min: number
  readonly onInput: (value: string) => void
  readonly suffix: string
  readonly value: string
}

const DurationField = (props: DurationFieldProps) => (
  <label class="focus-room-pomodoro-panel__duration-field">
    <span>{props.label}</span>
    <span class="focus-room-pomodoro-panel__duration-input">
      <input
        aria-label={props.accessibleLabel}
        max={props.max}
        min={props.min}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        step="1"
        type="number"
        value={props.value}
      />
      <span>{props.suffix}</span>
    </span>
  </label>
)
