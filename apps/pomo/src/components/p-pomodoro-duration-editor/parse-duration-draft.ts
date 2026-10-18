import {POMODORO_TIMER_LIMITS} from '../../features/pomodoro-timer/limits'
import type {PomodoroTimerConfig} from '../../features/pomodoro-timer/model'
import {normalizePasteNumericInput} from 'src/utils/normalize-paste-numeric-input'

export interface DurationDraft {
  /** 집중 시간의 분 단위 문자열. */
  readonly focus: string
  /** 긴 휴식 시간의 분 단위 문자열. */
  readonly longBreak: string
  /** 한 주기의 집중 횟수 문자열. */
  readonly sessions: string
  /** 짧은 휴식 시간의 분 단위 문자열. */
  readonly shortBreak: string
}

const MIN_DURATION_MINUTES = 1
const MIN_FOCUS_SESSIONS = 1
const SECONDS_PER_MINUTE = 60

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

/**
 * 네 입력을 정규화해 타이머 설정으로 해석하며 범위를 벗어나면 null을 반환한다.
 * 분은 1~120, 횟수는 1~12의 정수이며 기존 Number 표기 허용 규칙을 유지한다.
 * 입력을 수정하지 않고 매번 새 설정을 만들며 입력 읽기 오류는 그대로 전파한다.
 */
export const parseDurationDraft = (durationDraft: DurationDraft): PomodoroTimerConfig | null => {
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
}
