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

const getOptionByName = (name: string): HTMLElement => {
  const matches = [...document.querySelectorAll<HTMLElement>('[role="option"]')].filter(
    (option) => option.textContent?.trim() === name,
  )
  expect(matches).toHaveLength(1)
  const [option] = matches
  if (option === undefined) {
    throw new Error(`Expected a visible ${name} option`)
  }
  expect(option).toHaveRole('option')
  expect(option).toHaveAccessibleName(name)
  expect(option).toBeVisible()
  const accessibleOption = screen.getByRole('option', {name})
  expect(accessibleOption).toBe(option)
  return option
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it.each(['ArrowDown', 'ArrowUp', 'Enter', ' '])(
  'should keep keyboard focus after opening with %j and running pending timers',
  (key) => {
    const view = render(() => {
      const [value, setValue] = createSignal<'dark' | 'bright' | 'system'>('dark')
      return <PSelect label="Theme" onChange={setValue} options={options} value={value()} />
    })
    const triggers = [...view.container.querySelectorAll('button')]
    expect(triggers).toHaveLength(1)
    const trigger = triggers[0]
    if (trigger === undefined) {
      throw new Error('Expected one Theme select trigger')
    }
    expect(trigger).toHaveRole('button')
    expect(trigger).toHaveAccessibleName('Theme Dark')
    expect(trigger).toBeVisible()
    expect(screen.getByRole('button', {name: 'Theme Dark'})).toBe(trigger)
    trigger.focus()
    vi.useFakeTimers()

    fireEvent.keyDown(trigger, {key})
    const dark = getOptionByName('Dark')
    expect(dark).toHaveFocus()
    fireEvent.keyDown(dark, {key: 'End'})
    const system = getOptionByName('System')
    expect(system).toBeInTheDocument()
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

it('should skip disabled options by keyboard and prevent selecting them by pointer', () => {
  const change = vi.fn()
  render(() => (
    <PSelect
      label="Model"
      onChange={change}
      options={[
        {label: 'Local', value: 'local'},
        {disabled: true, label: 'Cloud (Sign in)', value: 'cloud'},
      ]}
      value="local"
    />
  ))
  const trigger = screen.getByRole('button', {name: 'Model Local'})
  trigger.focus()
  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  const local = screen.getByRole('option', {name: 'Local'})
  const cloud = screen.getByRole('option', {name: 'Cloud (Sign in)'})
  expect(cloud).toHaveAttribute('aria-disabled', 'true')
  fireEvent.keyDown(local, {key: 'End'})
  expect(local).toHaveFocus()
  fireEvent.click(cloud)
  expect(change).not.toHaveBeenCalled()
})
