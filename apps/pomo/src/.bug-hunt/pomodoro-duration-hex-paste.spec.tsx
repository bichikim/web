/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
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

it('should reject a hex pasted focus session count like unit converter and service days do', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()

  render(() => (
    <PPomodoroDurationEditor
      config={CONFIG}
      isEditing
      onChange={onChange}
      onEditingChange={vi.fn()}
    />
  ))

  const sessionInput = screen.getByRole('spinbutton', {name: '집중 횟수(회)'})
  await user.clear(sessionInput)
  await user.paste('0x5')

  const saveButton = screen.getByRole('button', {name: '설정 저장'})
  expect(saveButton).toHaveProperty('disabled', true)
  saveButton.removeAttribute('disabled')
  await user.click(saveButton)

  expect(onChange).not.toHaveBeenCalled()
})

it('should reject scientific notation pasted into focus duration minutes', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()

  render(() => (
    <PPomodoroDurationEditor
      config={CONFIG}
      isEditing
      onChange={onChange}
      onEditingChange={vi.fn()}
    />
  ))

  const focusInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
  await user.clear(focusInput)
  await user.paste('1e1')

  expect(screen.getByRole('button', {name: '설정 저장'})).toHaveProperty('disabled', true)
  expect(onChange).not.toHaveBeenCalled()
})
