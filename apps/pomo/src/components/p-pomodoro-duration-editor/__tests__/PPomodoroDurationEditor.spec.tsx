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

const SYNCED_CONFIG = {
  focusSeconds: 30 * 60,
  focusSessionsPerCycle: 6,
  longBreakSeconds: 20 * 60,
  shortBreakSeconds: 7 * 60,
} satisfies PomodoroTimerConfig

afterEach(() => {
  cleanup()
})

describe('PPomodoroDurationEditor', () => {
  it('should render the current settings while editing', () => {
    render(() => (
      <PPomodoroDurationEditor
        config={CONFIG}
        isEditing
        onChange={vi.fn()}
        onEditingChange={vi.fn()}
      />
    ))

    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')
    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '25')
    expect(screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'})).toHaveProperty(
      'value',
      '5',
    )
    expect(screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'})).toHaveProperty('value', '15')
  })

  it('should increment focus duration by one minute', () => {
    const [isEditing, setIsEditing] = createSignal(false)
    render(() => (
      <PPomodoroDurationEditor
        config={CONFIG}
        isEditing={isEditing()}
        onChange={vi.fn()}
        onEditingChange={setIsEditing}
      />
    ))

    fireEvent.click(screen.getByRole('button', {name: /4세션/}))
    const focusInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    fireEvent.click(screen.getByRole('button', {name: '집중 시간(분) 늘리기'}))
    expect(focusInput).toHaveProperty('value', '26')
  })

  it('should save edited duration settings and close the editor', () => {
    const [isEditing, setIsEditing] = createSignal(true)
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
    expect(onEditingChange).toHaveBeenCalledWith(false)

    fireEvent.click(summary)
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')
  })

  it('should discard cancelled edits and toggle the editor', () => {
    const [isEditing, setIsEditing] = createSignal(false)
    const onEditingChange = vi.fn((nextEditing: boolean) => setIsEditing(nextEditing))
    render(() => (
      <PPomodoroDurationEditor
        config={CONFIG}
        isEditing={isEditing()}
        onChange={vi.fn()}
        onEditingChange={onEditingChange}
      />
    ))
    const summary = screen.getByRole('button', {name: /4세션/})

    fireEvent.click(summary)
    fireEvent.input(screen.getByRole('spinbutton', {name: '집중 시간(분)'}), {
      target: {value: '30'},
    })
    fireEvent.click(screen.getByRole('button', {name: '취소'}))
    expect(screen.queryByRole('spinbutton')).toBeNull()

    fireEvent.click(summary)
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')
    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '25')
    fireEvent.click(summary)
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(onEditingChange).toHaveBeenLastCalledWith(false)
  })

  it('should refresh and save the config received while editing', () => {
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

    setConfig(SYNCED_CONFIG)

    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '6')
    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '30')
    expect(screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'})).toHaveProperty(
      'value',
      '7',
    )
    expect(screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'})).toHaveProperty('value', '20')

    fireEvent.click(screen.getByRole('button', {name: '설정 저장'}))

    expect(onChange).toHaveBeenCalledWith(SYNCED_CONFIG)
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
