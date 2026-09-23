/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {PRadioSwitch} from '../PRadioSwitch'

const OPTIONS = [
  {label: '낮', value: 'day'},
  {disabled: true, label: '밤', value: 'night'},
  {label: '자동', value: 'auto'},
] as const

describe('PRadioSwitch accessibility with Kobalte', () => {
  it('should preserve the named radio group and presentation wrapper around native radios', () => {
    render(() => <PRadioSwitch label="시간" onChange={vi.fn()} options={OPTIONS} value="day" />)

    const group = screen.getByRole('radiogroup', {name: '시간'})
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    for (const radio of radios) {
      expect(radio).toHaveAttribute('type', 'radio')
      const wrapper = radio.closest('[role="group"]')?.parentElement
      expect(wrapper?.parentElement).toBe(group)
      expect(wrapper).toHaveAttribute('role', 'presentation')
    }
    expect(within(group).getByRole('radio', {name: '낮'})).toBeChecked()
    expect(within(group).getByRole('radio', {name: '낮'})).toBeEnabled()
    expect(within(group).getByRole('radio', {name: '밤'})).toBeDisabled()
    expect(within(group).getByRole('radio', {name: '자동'})).not.toBeChecked()
  })

  it('should move focus and controlled selection while skipping disabled radios', () => {
    const onChange = vi.fn()
    render(() => {
      const [value, setValue] = createSignal('day')
      return (
        <PRadioSwitch
          label="시간"
          onChange={(nextValue) => {
            onChange(nextValue)
            setValue(nextValue)
          }}
          options={OPTIONS}
          value={value()}
        />
      )
    })

    const day = screen.getByRole('radio', {name: '낮'})
    const automatic = screen.getByRole('radio', {name: '자동'})
    day.focus()
    fireEvent.keyDown(day, {key: 'ArrowRight'})
    expect(automatic).toHaveFocus()
    expect(automatic).toBeChecked()
    expect(day).not.toBeChecked()
    expect(onChange).toHaveBeenNthCalledWith(1, 'auto')

    fireEvent.keyDown(automatic, {key: 'ArrowLeft'})
    expect(day).toHaveFocus()
    expect(day).toBeChecked()
    expect(automatic).not.toBeChecked()
    expect(onChange).toHaveBeenNthCalledWith(2, 'day')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('should disable all native radios and prevent selection when the switch is disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(() => (
      <PRadioSwitch disabled label="시간" onChange={onChange} options={OPTIONS} value="day" />
    ))

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
      fireEvent.keyDown(radio, {key: 'ArrowRight'})
    }
    await user.click(screen.getByRole('radio', {name: '자동'}))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', {name: '낮'})).toBeChecked()
  })
})
