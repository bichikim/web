/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
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
    const focusInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    const sessionInput = screen.getByRole('spinbutton', {name: '집중 횟수(회)'})
    const shortBreakInput = screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'})
    const longBreakInput = screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'})
    const incrementButton = screen.getByRole('button', {name: '집중 시간(분) 늘리기'})
    const saveButton = screen.getByRole('button', {name: '설정 저장'})

    expect(sessionInput).toHaveProperty('value', '4')
    expect(focusInput).toHaveProperty('value', '25')
    expect(shortBreakInput).toHaveProperty('value', '5')
    expect(longBreakInput).toHaveProperty('value', '15')
    fireEvent.click(incrementButton)
    expect(focusInput).toHaveProperty('value', '26')

    fireEvent.input(sessionInput, {target: {value: '6'}})
    fireEvent.input(focusInput, {target: {value: '30'}})
    fireEvent.input(shortBreakInput, {target: {value: '7'}})
    fireEvent.input(longBreakInput, {target: {value: '20'}})
    fireEvent.click(saveButton)

    expect(onChange).toHaveBeenCalledWith({
      focusSeconds: 30 * 60,
      focusSessionsPerCycle: 6,
      longBreakSeconds: 20 * 60,
      shortBreakSeconds: 7 * 60,
    })
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(onEditingChange).toHaveBeenCalledWith(false)

    fireEvent.click(summary)
    const reopenedSessionInput = screen.getByRole('spinbutton', {name: '집중 횟수(회)'})
    const reopenedFocusInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    const cancelButton = screen.getByRole('button', {name: '취소'})
    expect(reopenedSessionInput).toHaveProperty('value', '4')
    fireEvent.input(reopenedFocusInput, {target: {value: '30'}})
    fireEvent.click(cancelButton)
    expect(screen.queryByRole('spinbutton')).toBeNull()

    fireEvent.click(summary)
    const resetSessionInput = screen.getByRole('spinbutton', {name: '집중 횟수(회)'})
    const resetFocusInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    expect(resetSessionInput).toHaveProperty('value', '4')
    expect(resetFocusInput).toHaveProperty('value', '25')
    fireEvent.click(summary)
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(onEditingChange).toHaveBeenLastCalledWith(false)
  })

  it('should save fullwidth duration and session count values pasted into the fields', async () => {
    const [isEditing, setIsEditing] = createSignal(false)
    const onChange = vi.fn()
    const onEditingChange = vi.fn((nextEditing: boolean) => setIsEditing(nextEditing))
    const user = userEvent.setup()
    render(() => (
      <PPomodoroDurationEditor
        config={CONFIG}
        isEditing={isEditing()}
        onChange={onChange}
        onEditingChange={onEditingChange}
      />
    ))
    const summary = screen.getByRole('button', {name: /4세션/})

    await user.click(summary)

    const sessionInput = screen.getByRole('spinbutton', {name: '집중 횟수(회)'})
    await user.clear(sessionInput)
    await user.paste('６')
    const durationInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    await user.clear(durationInput)
    await user.paste('３０')

    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '６')
    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '３０')
    expect(screen.getByRole('button', {name: '설정 저장'})).toHaveProperty('disabled', false)

    await user.click(screen.getByRole('button', {name: '설정 저장'}))

    expect(onChange).toHaveBeenCalledWith({
      focusSeconds: 30 * 60,
      focusSessionsPerCycle: 6,
      longBreakSeconds: 15 * 60,
      shortBreakSeconds: 5 * 60,
    })
    expect(screen.queryByRole('spinbutton')).toBeNull()

    await user.click(summary)
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')
    const focusInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    expect(focusInput).toHaveProperty('value', '25')
    await user.clear(focusInput)
    await user.paste('４０')
    await user.click(screen.getByRole('button', {name: '취소'}))
    expect(screen.queryByRole('spinbutton')).toBeNull()

    await user.click(summary)
    expect(screen.getByRole('spinbutton', {name: '집중 횟수(회)'})).toHaveProperty('value', '4')
    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toHaveProperty('value', '25')
  })

  it('should accept fullwidth values at the duration and session bounds', async () => {
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

    const focusCountInput = screen.getByRole('spinbutton', {name: '집중 횟수(회)'})
    await user.clear(focusCountInput)
    await user.paste('１２')
    const focusDurationInput = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    await user.clear(focusDurationInput)
    await user.paste('１')
    const shortBreakInput = screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'})
    await user.clear(shortBreakInput)
    await user.paste('１２０')
    const longBreakInput = screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'})
    await user.clear(longBreakInput)
    await user.paste('１')

    expect(screen.getByRole('button', {name: '설정 저장'})).toHaveProperty('disabled', false)
    await user.click(screen.getByRole('button', {name: '설정 저장'}))

    expect(onChange).toHaveBeenCalledWith({
      focusSeconds: 60,
      focusSessionsPerCycle: 12,
      longBreakSeconds: 60,
      shortBreakSeconds: 120 * 60,
    })
  })

  it('should keep partial selection paste behavior when normalizing duration digits', async () => {
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
    const focusInput = screen.getByRole('spinbutton', {
      name: '집중 시간(분)',
    }) as HTMLInputElement

    await user.click(focusInput)
    focusInput.setSelectionRange(1, 2)
    await user.paste('３')

    expect(focusInput).toHaveProperty('value', '2３')
    expect(screen.getByRole('button', {name: '설정 저장'})).toHaveProperty('disabled', false)
    await user.click(screen.getByRole('button', {name: '설정 저장'}))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({focusSeconds: 23 * 60}))
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
    {accessibleLabel: '집중 시간(분)', paste: true, value: '０'},
    {accessibleLabel: '집중 시간(분)', paste: true, value: '１.５'},
    {accessibleLabel: '짧은 휴식 시간(분)', paste: true, value: '１２１'},
    {accessibleLabel: '집중 횟수(회)', paste: true, value: '１３'},
  ])('should reject $value for $accessibleLabel', async ({accessibleLabel, value, paste}) => {
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

    const input = screen.getByRole('spinbutton', {name: accessibleLabel})
    if (paste) {
      const user = userEvent.setup()
      await user.clear(input)
      await user.paste(value)
    } else {
      fireEvent.input(input, {target: {value}})
    }
    const saveButton = screen.getByRole('button', {name: '설정 저장'})

    expect(saveButton).toHaveProperty('disabled', true)
    saveButton.removeAttribute('disabled')
    fireEvent.click(saveButton)

    expect(onChange).not.toHaveBeenCalled()
    expect(onEditingChange).not.toHaveBeenCalled()
  })
})
