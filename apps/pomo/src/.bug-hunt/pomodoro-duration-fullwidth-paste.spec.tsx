/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import type {PomodoroTimerConfig} from 'src/features/pomodoro-timer'
import {PPomodoroDurationEditor} from '../components/p-pomodoro-duration-editor/PPomodoroDurationEditor'

const CONFIG = {
  focusSeconds: 25 * 60,
  focusSessionsPerCycle: 4,
  longBreakSeconds: 15 * 60,
  shortBreakSeconds: 5 * 60,
} satisfies PomodoroTimerConfig

afterEach(() => {
  cleanup()
})

it('should save focus duration pasted with fullwidth digits', () => {
  const onChange = vi.fn()
  render(() => (
    <PPomodoroDurationEditor
      config={CONFIG}
      isEditing
      onChange={onChange}
      onEditingChange={vi.fn()}
    />
  ))

  fireEvent.input(screen.getByRole('spinbutton', {name: '집중 시간(분)'}), {
    target: {value: '３０'},
  })

  const saveButton = screen.getByRole('button', {name: '설정 저장'})
  expect(saveButton).toHaveProperty('disabled', false)
  fireEvent.click(saveButton)

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({focusSeconds: 30 * 60}))
})
