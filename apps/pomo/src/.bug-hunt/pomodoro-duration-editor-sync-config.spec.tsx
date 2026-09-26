/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {PomodoroTimerConfig} from 'src/features/pomodoro-timer'
import {PPomodoroDurationEditor} from '../components/p-pomodoro-duration-editor/PPomodoroDurationEditor'

const CONFIG = {
  focusSeconds: 25 * 60,
  focusSessionsPerCycle: 4,
  longBreakSeconds: 15 * 60,
  shortBreakSeconds: 5 * 60,
} satisfies PomodoroTimerConfig

const REMOTE_CONFIG = {
  focusSeconds: 30 * 60,
  focusSessionsPerCycle: 6,
  longBreakSeconds: 20 * 60,
  shortBreakSeconds: 7 * 60,
} satisfies PomodoroTimerConfig

afterEach(() => {
  cleanup()
})

describe('PPomodoroDurationEditor config sync while editing', () => {
  it('should refresh draft fields when the saved config changes during editing', () => {
    const [config, setConfig] = createSignal(CONFIG)
    const onChange = vi.fn()

    render(() => (
      <PPomodoroDurationEditor
        config={config()}
        isEditing
        onChange={onChange}
        onEditingChange={vi.fn()}
      />
    ))

    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '25')
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')

    setConfig(REMOTE_CONFIG)

    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '30')
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '6')
    expect(screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'})).toHaveProperty(
      'value',
      '7',
    )
    expect(screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'})).toHaveProperty('value', '20')
  })

  it('should apply the synced config when saving without further local edits', () => {
    const [config, setConfig] = createSignal(CONFIG)
    const onChange = vi.fn()

    render(() => (
      <PPomodoroDurationEditor
        config={config()}
        isEditing
        onChange={onChange}
        onEditingChange={vi.fn()}
      />
    ))

    setConfig(REMOTE_CONFIG)
    screen.getByRole('button', {name: '설정 저장'}).click()

    expect(onChange).toHaveBeenCalledWith(REMOTE_CONFIG)
  })
})
