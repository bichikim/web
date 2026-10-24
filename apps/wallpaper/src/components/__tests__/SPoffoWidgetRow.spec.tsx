/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {SPoffoWidgetRow} from '../SPoffoWidgetRow'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeEach(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterEach(() => {
  cleanup()
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})

test('should distinguish widget selection from the independent close action', () => {
  const select = vi.fn()
  const close = vi.fn()
  render(() => (
    <SPoffoWidgetRow
      widget={{assetId: 'character', id: 'widget', tracking: 'cursor', x: null, y: null}}
      number={2}
      name="Character.json"
      selected={true}
      onSelect={select}
      onClose={close}
    />
  ))
  expect(screen.getByText('위젯 2')).toBeDefined()
  expect(screen.getByText('Character.json').tagName).toBe('SPAN')
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.getByRole('button', {name: '위젯 2 설정'})).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(screen.getByText('위젯 2'))
  expect(select).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', {name: /보정 설정/})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '위젯 2 닫기'}))
  expect(close).toHaveBeenCalledOnce()
  expect(select).toHaveBeenCalledOnce()
})
