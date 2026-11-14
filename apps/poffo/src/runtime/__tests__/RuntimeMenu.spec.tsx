/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {RuntimeMenu} from '../RuntimeMenu'

beforeEach(() => vi.useFakeTimers())
afterEach(async () => {
  cleanup()
  await vi.runAllTimersAsync()
  vi.useRealTimers()
})

test('should keep the menu open when its focused control has already handled Escape', async () => {
  const view = render(() => <RuntimeMenu onLoadModel={vi.fn()} />)
  const trigger = view.getByRole('button', {name: '메인 메뉴'})
  fireEvent.click(trigger)
  await vi.runAllTimersAsync()
  const control = view.getByRole('button', {name: '모델 불러오기'})
  control.focus()
  const consumeEscape = (event: KeyboardEvent) => event.preventDefault()
  control.addEventListener('keydown', consumeEscape)
  try {
    fireEvent.keyDown(control, {key: 'Escape'})
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(control).toHaveFocus()
  } finally {
    control.removeEventListener('keydown', consumeEscape)
  }
})
