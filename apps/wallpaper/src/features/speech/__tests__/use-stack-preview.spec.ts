/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useStackPreview} from '../use-stack-preview'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
const mount = () => {
  const [busy, setBusy] = createSignal(false)
  const view = renderHook(() => useStackPreview({busy}))
  return {...view, setBusy}
}

it('should restart idle hiding on movement and reveal again without leaving first', () => {
  const {result} = mount()
  expect(result.expanded()).toBe(false)
  result.enter()
  vi.advanceTimersByTime(2999)
  expect(result.expanded()).toBe(true)
  result.move()
  vi.advanceTimersByTime(2999)
  expect(result.expanded()).toBe(true)
  vi.advanceTimersByTime(1)
  expect(result.expanded()).toBe(false)
  result.move()
  expect(result.expanded()).toBe(true)
})

it('should cancel pending exit hiding when the pointer returns', () => {
  const {result} = mount()
  result.enter()
  result.leave()
  vi.advanceTimersByTime(199)
  expect(result.expanded()).toBe(true)
  result.enter()
  vi.advanceTimersByTime(1)
  expect(result.expanded()).toBe(true)
  result.leave()
  vi.advanceTimersByTime(200)
  expect(result.expanded()).toBe(false)
})

it('should suspend hiding during selection or dragging and start a fresh delay afterward', () => {
  const {result, setBusy} = mount()
  result.enter()
  vi.advanceTimersByTime(2900)
  setBusy(true)
  vi.advanceTimersByTime(4000)
  expect(result.expanded()).toBe(true)
  setBusy(false)
  vi.advanceTimersByTime(2999)
  expect(result.expanded()).toBe(true)
  vi.advanceTimersByTime(1)
  expect(result.expanded()).toBe(false)
})

it('should release a pressed pointer outside the stack or when its gesture is cancelled', () => {
  const {result} = mount()
  result.enter()
  result.press()
  result.leave()
  vi.advanceTimersByTime(4000)
  expect(result.expanded()).toBe(true)
  globalThis.dispatchEvent(new Event('pointerup'))
  vi.advanceTimersByTime(200)
  expect(result.expanded()).toBe(false)
  result.press()
  globalThis.dispatchEvent(new Event('pointercancel'))
  vi.advanceTimersByTime(200)
  expect(result.expanded()).toBe(false)
})

it('should clear interaction holds when the window loses focus and cancel timers on disposal', () => {
  const {result} = mount()
  result.keyboard()
  result.press()
  vi.advanceTimersByTime(4000)
  expect(result.expanded()).toBe(true)
  globalThis.dispatchEvent(new Event('blur'))
  vi.advanceTimersByTime(200)
  expect(result.expanded()).toBe(false)
  result.enter()
  expect(vi.getTimerCount()).toBe(1)
  cleanup()
  expect(vi.getTimerCount()).toBe(0)
  globalThis.dispatchEvent(new Event('pointerup'))
  expect(vi.getTimerCount()).toBe(0)
})
