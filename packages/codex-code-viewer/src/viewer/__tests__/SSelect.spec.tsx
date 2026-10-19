/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SSelect} from '../SSelect'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
const options = ['매출', '요약', '메모', '빈 시트']
const Selection = () => {
  const [value, setValue] = createSignal('매출')
  return <SSelect label="시트 선택" options={options} value={value()} onChange={setValue} />
}

describe('SSelect', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    for (const [name, descriptor] of [
      ['showPopover', originalPopover],
      ['scrollIntoView', originalScroll],
    ] as const) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, name)
      } else {
        Object.defineProperty(HTMLElement.prototype, name, descriptor)
      }
    }
  })
  it('should choose an option from a custom list and retain focus on the trigger', () => {
    render(Selection)
    const trigger = screen.getByRole('combobox', {name: '시트 선택'})
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('option', {name: '매출', selected: true})).toBeTruthy()
    fireEvent.click(screen.getByRole('option', {name: '메모'}))
    expect(trigger.textContent).toBe('메모')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
  it('should navigate with arrows and boundary keys before committing with Enter', () => {
    render(Selection)
    const trigger = screen.getByRole('combobox', {name: '시트 선택'})
    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    expect(trigger.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', {name: '매출'}).id,
    )
    fireEvent.keyDown(trigger, {key: 'ArrowUp'})
    expect(trigger.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', {name: '빈 시트'}).id,
    )
    fireEvent.keyDown(trigger, {key: 'Home'})
    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    expect(trigger.textContent).toBe('매출')
    fireEvent.keyDown(trigger, {key: 'Enter'})
    expect(trigger.textContent).toBe('요약')
    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    fireEvent.keyDown(trigger, {key: 'End'})
    fireEvent.keyDown(trigger, {key: ' '})
    expect(trigger.textContent).toBe('빈 시트')
  })
  it('should dismiss with Escape, Tab, blur and native light dismiss without committing', () => {
    render(Selection)
    const trigger = screen.getByRole('combobox', {name: '시트 선택'})
    for (const key of ['Escape', 'Tab']) {
      fireEvent.click(trigger)
      fireEvent.keyDown(trigger, {key: 'ArrowDown'})
      fireEvent.keyDown(trigger, {key})
      expect(screen.queryByRole('listbox')).toBeNull()
      expect(trigger.textContent).toBe('매출')
    }
    fireEvent.click(trigger)
    fireEvent.blur(trigger)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(trigger)
    const closed = new Event('beforetoggle')
    Object.defineProperty(closed, 'newState', {value: 'closed'})
    fireEvent(screen.getByRole('listbox'), closed)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
  it('should find an option by its first character and disable an empty selection', () => {
    render(Selection)
    const trigger = screen.getByRole('combobox', {name: '시트 선택'})
    fireEvent.keyDown(trigger, {key: '메'})
    fireEvent.keyDown(trigger, {key: 'Enter'})
    expect(trigger.textContent).toBe('메모')
    cleanup()
    render(() => <SSelect label="빈 선택" options={[]} />)
    expect(screen.getByRole<HTMLButtonElement>('combobox', {name: '빈 선택'}).disabled).toBe(true)
  })
})
