/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {useDeferredValue} from '../use-deferred-value'

const frames = new Map<number, FrameRequestCallback>()
let frameId = 0
const paint = () => {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((callback) => callback(0))
}
beforeEach(() => {
  frames.clear()
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frameId += 1
      frames.set(frameId, callback)
      return frameId
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  )
})
afterEach(() => vi.unstubAllGlobals())

test('should expose the requested value immediately and commit after an intervening frame', () =>
  createRoot((dispose) => {
    const onCommit = vi.fn()
    const state = useDeferredValue({initialValue: 'old', onCommit})
    state.select('new')
    expect(state.value()).toBe('new')
    expect(state.committed()).toBe('old')
    expect(state.pending()).toBe(true)
    paint()
    expect(onCommit).not.toHaveBeenCalled()
    expect(state.committed()).toBe('old')
    paint()
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('new')
    expect(state.committed()).toBe('new')
    expect(state.pending()).toBe(false)
    dispose()
  }))

test('should discard superseded callbacks and commit only the last requested value', () =>
  createRoot((dispose) => {
    const onCommit = vi.fn()
    const state = useDeferredValue({initialValue: 'old', onCommit})
    state.select('first')
    paint()
    const stale = [...frames.values()][0]!
    state.select('last')
    stale(0)
    expect(state.committed()).toBe('old')
    paint()
    paint()
    expect(state.value()).toBe('last')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('last')
    dispose()
  }))

test('should cancel pending work on reset and when its owner is disposed', () => {
  const onCommit = vi.fn()
  let dispose = () => {}
  const state = createRoot((cleanup) => {
    dispose = cleanup
    return useDeferredValue({initialValue: 'old', onCommit})
  })
  state.select('pending')
  state.reset('replacement')
  paint()
  paint()
  expect(state.value()).toBe('replacement')
  expect(state.committed()).toBe('replacement')
  expect(state.pending()).toBe(false)
  state.select('disposed')
  dispose()
  paint()
  paint()
  expect(onCommit).not.toHaveBeenCalled()
})
