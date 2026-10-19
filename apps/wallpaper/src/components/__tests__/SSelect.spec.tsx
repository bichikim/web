/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {SSelect} from '../SSelect'

const OPTIONS = [
  {label: 'Sequential', value: 'sequential'},
  {label: 'Random', value: 'random'},
  {label: 'Reverse', value: 'reverse'},
] as const
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(cleanup)

it('should render a custom list and retain the committed value until a choice is saved', () => {
  const onChange = vi.fn()
  const [value, setValue] = createSignal('sequential')
  render(() => <SSelect label="Order" options={OPTIONS} value={value()} onChange={onChange} />)
  const trigger = screen.getByRole('combobox', {name: 'Order'})
  fireEvent.click(trigger)
  expect(trigger).toHaveFocus()
  fireEvent.click(screen.getByRole('option', {name: 'Random'}))
  expect(onChange).toHaveBeenCalledWith('random')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(trigger).toHaveTextContent('Sequential')
  setValue('random')
  expect(trigger).toHaveTextContent('Random')
})

it('should navigate with arrows and commit with Enter while retaining trigger focus', () => {
  const onChange = vi.fn()
  render(() => <SSelect label="Order" options={OPTIONS} onChange={onChange} />)
  const trigger = screen.getByRole('combobox')
  trigger.focus()
  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  expect(trigger).toHaveAttribute(
    'aria-activedescendant',
    screen.getByRole('option', {name: 'Random'}).id,
  )
  fireEvent.keyDown(trigger, {key: 'Enter'})
  expect(onChange).toHaveBeenCalledWith('random')
  expect(trigger).toHaveTextContent('Random')
  expect(trigger).toHaveFocus()
})

it('should cancel on Escape and commit the active option on Tab without preventing navigation', () => {
  const onChange = vi.fn()
  render(() => <SSelect label="Order" options={OPTIONS} onChange={onChange} />)
  const trigger = screen.getByRole('combobox')
  fireEvent.keyDown(trigger, {key: 'End'})
  fireEvent.keyDown(trigger, {key: 'Escape'})
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.keyDown(trigger, {key: 'End'})
  const event = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Tab'})
  fireEvent(trigger, event)
  expect(event.defaultPrevented).toBe(false)
  expect(onChange).toHaveBeenCalledWith('reverse')
  expect(screen.queryByRole('listbox')).toBeNull()
})

it('should search labels by typing and ignore IME composition', () => {
  render(() => <SSelect label="Order" options={OPTIONS} />)
  const trigger = screen.getByRole('combobox')
  fireEvent.keyDown(trigger, {key: 'r'})
  fireEvent.keyDown(trigger, {key: 'a'})
  expect(trigger).toHaveAttribute(
    'aria-activedescendant',
    screen.getByRole('option', {name: 'Random'}).id,
  )
  fireEvent.keyDown(trigger, {isComposing: true, key: 's'})
  fireEvent.keyDown(trigger, {key: 'Enter'})
  expect(trigger).toHaveTextContent('Random')
})

it('should dismiss when the platform closes the popover and disable selection while busy', () => {
  const [disabled, setDisabled] = createSignal(false)
  render(() => <SSelect label="Order" options={OPTIONS} disabled={disabled()} />)
  const trigger = screen.getByRole('combobox')
  fireEvent.click(trigger)
  const event = new Event('beforetoggle')
  Object.defineProperty(event, 'newState', {value: 'closed'})
  fireEvent(screen.getByRole('listbox'), event)
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  setDisabled(true)
  fireEvent.click(trigger)
  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(trigger).toHaveAttribute('aria-disabled', 'true')
})
