/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PSelect} from '../PSelect'

const options = [
  {label: 'Dark', value: 'dark'},
  {label: 'Light', value: 'bright'},
  {label: 'System', value: 'system'},
] as const

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it.each(['ArrowDown', 'ArrowUp', 'Enter', ' '])(
  'should keep keyboard focus after opening with %j and running pending timers',
  (key) => {
    render(() => {
      const [value, setValue] = createSignal<'dark' | 'bright' | 'system'>('dark')
      return <PSelect label="Theme" onChange={setValue} options={options} value={value()} />
    })
    const trigger = screen.getByRole('button', {name: 'Theme Dark'})
    trigger.focus()
    vi.useFakeTimers()

    fireEvent.keyDown(trigger, {key})
    const dark = screen.getByRole('option', {name: 'Dark'})
    expect(dark).toHaveFocus()
    fireEvent.keyDown(dark, {key: 'End'})
    const system = screen.getByRole('option', {name: 'System'})
    expect(system).toHaveFocus()

    vi.runOnlyPendingTimers()
    expect(system).toHaveFocus()
    fireEvent.keyDown(system, {key: 'Enter'})
    expect(trigger).toHaveTextContent('System')
  },
)

it('should keep multi-select keyboard focus when pending timers run', () => {
  render(() => {
    const [value, setValue] = createSignal<ReadonlyArray<'dark' | 'bright' | 'system'>>(['dark'])
    return <PSelect label="Themes" multiple onChange={setValue} options={options} value={value()} />
  })
  const trigger = screen.getByRole('button', {name: 'Themes 1개 선택'})
  trigger.focus()
  vi.useFakeTimers()

  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  const dark = screen.getByRole('option', {name: 'Dark'})
  expect(dark).toHaveFocus()
  fireEvent.keyDown(dark, {key: 'End'})
  const system = screen.getByRole('option', {name: 'System'})
  expect(system).toHaveFocus()

  vi.runOnlyPendingTimers()
  expect(system).toHaveFocus()
  fireEvent.keyDown(system, {key: 'Enter'})
  expect(trigger).toHaveTextContent('2개 선택')
  expect(system).toHaveAttribute('aria-selected', 'true')
  expect(system).toHaveFocus()
})
