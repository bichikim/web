import {createMemo, createSignal, Show, untrack} from 'solid-js'

import {PButton} from '../p-button/PButton'
import {POMODORO_TIMER_LIMITS, type PomodoroTimerConfig} from '../../features/pomodoro-timer'
import * as m from '@paraglide/message'
import {DurationField} from '../pomodoro-duration-editor/Field'
import {CLASSES} from '../pomodoro-duration-editor/shared'
import {normalizePasteNumericInput} from 'src/utils/normalize-paste-numeric-input'

interface DurationDraft {
  readonly focus: string
  readonly longBreak: string
  readonly sessions: string
  readonly shortBreak: string
}

interface DurationDraftState {
  readonly baseConfig: PomodoroTimerConfig
  readonly draft: DurationDraft
}

const MIN_DURATION_MINUTES = 1
const MIN_FOCUS_SESSIONS = 1
const SECONDS_PER_MINUTE = 60

export interface PPomodoroDurationEditorProps {
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

const getDraftForConfig = (
  config: PomodoroTimerConfig,
  draftState: DurationDraftState,
): DurationDraft => {
  const {baseConfig, draft} = draftState

  return baseConfig === config ? draft : createDurationDraft(config)
}

const parseDurationMinutes = (value: string) => {
  const minutes = Number(normalizePasteNumericInput(value))

  if (
    !Number.isInteger(minutes) ||
    minutes < MIN_DURATION_MINUTES ||
    minutes > POMODORO_TIMER_LIMITS.maxDurationMinutes
  ) {
    return null
  }

  return minutes
}

export const PPomodoroDurationEditor = (props: PPomodoroDurationEditorProps) => {
  const [draftState, setDraftState] = createSignal<DurationDraftState>(
    untrack(() => {
      const config = props.config

      return {baseConfig: config, draft: createDurationDraft(config)}
    }),
  )
  const draft = createMemo(() => getDraftForConfig(props.config, draftState()))
  const updateDraft = (update: (current: DurationDraft) => DurationDraft) => {
    const config = props.config

    setDraftState({baseConfig: config, draft: update(getDraftForConfig(config, draftState()))})
  }
  const summary = () =>
    m.pomodoro_cycle_summary({
      focus: props.config.focusSeconds / SECONDS_PER_MINUTE,
      longBreak: props.config.longBreakSeconds / SECONDS_PER_MINUTE,
      sessions: props.config.focusSessionsPerCycle,
      shortBreak: props.config.shortBreakSeconds / SECONDS_PER_MINUTE,
    })
  const nextConfig = createMemo(() => {
    const durationDraft = draft()
    const focusMinutes = parseDurationMinutes(durationDraft.focus)
    const longBreakMinutes = parseDurationMinutes(durationDraft.longBreak)
    const sessionCount = Number(normalizePasteNumericInput(durationDraft.sessions))
    const shortBreakMinutes = parseDurationMinutes(durationDraft.shortBreak)

    if (
      focusMinutes === null ||
      longBreakMinutes === null ||
      shortBreakMinutes === null ||
      !Number.isInteger(sessionCount) ||
      sessionCount < MIN_FOCUS_SESSIONS ||
      sessionCount > POMODORO_TIMER_LIMITS.maxFocusSessions
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
      const config = props.config

      setDraftState({baseConfig: config, draft: createDurationDraft(config)})
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
        class={CLASSES.pomodoroPanelRoutine}
        onClick={handleToggle}
        type="button"
      >
        <span>{summary()}</span>
        <span aria-hidden="true" class="i-tabler-pencil size-3.5" />
      </button>

      <Show when={props.isEditing}>
        <div class={CLASSES.pomodoroPanelDurationEditor}>
          <div class={CLASSES.pomodoroPanelDurationFields}>
            <DurationField
              accessibleLabel={m.pomodoro_focus_count_accessible()}
              decrementLabel={m.pomodoro_decrease({label: m.pomodoro_focus_count_accessible()})}
              incrementLabel={m.pomodoro_increase({label: m.pomodoro_focus_count_accessible()})}
              label={m.pomodoro_focus_count_label()}
              max={POMODORO_TIMER_LIMITS.maxFocusSessions}
              min={MIN_FOCUS_SESSIONS}
              onInput={(value) => updateDraft((current) => ({...current, sessions: value}))}
              suffix={m.pomodoro_count_suffix()}
              value={draft().sessions}
            />
            <DurationField
              accessibleLabel={m.pomodoro_focus_duration_accessible()}
              decrementLabel={m.pomodoro_decrease({label: m.pomodoro_focus_duration_accessible()})}
              incrementLabel={m.pomodoro_increase({label: m.pomodoro_focus_duration_accessible()})}
              label={m.pomodoro_focus_duration()}
              max={POMODORO_TIMER_LIMITS.maxDurationMinutes}
              min={MIN_DURATION_MINUTES}
              onInput={(value) => updateDraft((current) => ({...current, focus: value}))}
              suffix={m.pomodoro_minute_suffix()}
              value={draft().focus}
            />
            <DurationField
              accessibleLabel={m.pomodoro_short_break_accessible()}
              decrementLabel={m.pomodoro_decrease({label: m.pomodoro_short_break_accessible()})}
              incrementLabel={m.pomodoro_increase({label: m.pomodoro_short_break_accessible()})}
              label={m.pomodoro_short_break()}
              max={POMODORO_TIMER_LIMITS.maxDurationMinutes}
              min={MIN_DURATION_MINUTES}
              onInput={(value) => updateDraft((current) => ({...current, shortBreak: value}))}
              suffix={m.pomodoro_minute_suffix()}
              value={draft().shortBreak}
            />
            <DurationField
              accessibleLabel={m.pomodoro_long_break_accessible()}
              decrementLabel={m.pomodoro_decrease({label: m.pomodoro_long_break_accessible()})}
              incrementLabel={m.pomodoro_increase({label: m.pomodoro_long_break_accessible()})}
              label={m.pomodoro_long_break_duration()}
              max={POMODORO_TIMER_LIMITS.maxDurationMinutes}
              min={MIN_DURATION_MINUTES}
              onInput={(value) => updateDraft((current) => ({...current, longBreak: value}))}
              suffix={m.pomodoro_minute_suffix()}
              value={draft().longBreak}
            />
          </div>
          <div class={CLASSES.pomodoroPanelDurationActions}>
            <PButton
              bordered
              transparent
              class="w-full"
              disabled={nextConfig() === null}
              icon="i-tabler-check"
              onPress={handleSave}
              size="small"
              tone="secondary"
            >
              {m.pomodoro_save()}
            </PButton>
            <PButton
              bordered
              transparent
              class="w-full"
              icon="i-tabler-x"
              onPress={() => props.onEditingChange(false)}
              size="small"
              tone="secondary"
            >
              {m.pomodoro_cancel()}
            </PButton>
          </div>
          <p class={CLASSES.pomodoroPanelDurationHelp}>{m.pomodoro_duration_help()}</p>
        </div>
      </Show>
    </>
  )
}
