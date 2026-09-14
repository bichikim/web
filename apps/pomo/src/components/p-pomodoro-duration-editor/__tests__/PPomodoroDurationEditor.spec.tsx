/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {PomodoroTimerConfig} from 'src/features/pomodoro-timer'
import {PPomodoroDurationEditor} from '../PPomodoroDurationEditor'

const CONFIG = {
  focusSeconds: 25 * 60,
  focusSessionsPerCycle: 4,
  longBreakSeconds: 15 * 60,
  shortBreakSeconds: 5 * 60,
} satisfies PomodoroTimerConfig

afterEach(() => {
  cleanup()
})

describe('PPomodoroDurationEditor', () => {
  it('should edit, save, reset, cancel, and toggle duration settings', () => {
    const [isEditing, setIsEditing] = createSignal(false)
    const onChange = vi.fn()
    const onEditingChange = vi.fn((nextEditing: boolean) => setIsEditing(nextEditing))
    render(() => (
      <PPomodoroDurationEditor
        config={CONFIG}
        isEditing={isEditing()}
        onChange={onChange}
        onEditingChange={onEditingChange}
      />
    ))
    const summary = screen.getByRole('button', {name: /4세션/})

    fireEvent.click(summary)
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')
    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '25')
    expect(screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'})).toHaveProperty(
      'value',
      '5',
    )
    expect(screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'})).toHaveProperty('value', '15')

    fireEvent.input(screen.getByRole('spinbutton', {name: '집중 횟수(회)'}), {
      target: {value: '6'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '집중 시간(분)'}), {
      target: {value: '30'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'}), {
      target: {value: '7'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'}), {
      target: {value: '20'},
    })
    fireEvent.click(screen.getByRole('button', {name: '설정 저장'}))

    expect(onChange).toHaveBeenCalledWith({
      focusSeconds: 30 * 60,
      focusSessionsPerCycle: 6,
      longBreakSeconds: 20 * 60,
      shortBreakSeconds: 7 * 60,
    })
    expect(screen.queryByRole('spinbutton')).toBeNull()

    fireEvent.click(summary)
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')
    fireEvent.click(screen.getByRole('button', {name: '취소'}))
    expect(screen.queryByRole('spinbutton')).toBeNull()

    fireEvent.click(summary)
    fireEvent.click(summary)
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(onEditingChange).toHaveBeenLastCalledWith(false)
  })

  it.each([
    {accessibleLabel: '집중 시간(분)', value: '1.5'},
    {accessibleLabel: '긴 휴식 시간(분)', value: '0'},
    {accessibleLabel: '짧은 휴식 시간(분)', value: '121'},
    {accessibleLabel: '집중 횟수(회)', value: '1.5'},
    {accessibleLabel: '집중 횟수(회)', value: '0'},
    {accessibleLabel: '집중 횟수(회)', value: '13'},
  ])('should reject $value for $accessibleLabel', ({accessibleLabel, value}) => {
    const onChange = vi.fn()
    const onEditingChange = vi.fn()
    render(() => (
      <PPomodoroDurationEditor
        config={CONFIG}
        isEditing
        onChange={onChange}
        onEditingChange={onEditingChange}
      />
    ))

    fireEvent.input(screen.getByRole('spinbutton', {name: accessibleLabel}), {
      target: {value},
    })
    const saveButton = screen.getByRole('button', {name: '설정 저장'})

    expect(saveButton).toHaveProperty('disabled', true)
    saveButton.removeAttribute('disabled')
    fireEvent.click(saveButton)

    expect(onChange).not.toHaveBeenCalled()
    expect(onEditingChange).not.toHaveBeenCalled()
  })
})
