import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {SceneLoadingState} from '../scene-loading-state'

beforeEach(() => {
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should report immediate loading and completion changes', () => {
  const onChange = vi.fn()
  const state = new SceneLoadingState(onChange)

  state.start()
  state.finish()

  expect(onChange.mock.calls).toEqual([[true], [false]])
})

it('should finish after two paint frames and replace pending completion', () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    }),
  )
  const onChange = vi.fn()
  const state = new SceneLoadingState(onChange)
  state.finishAfterPaint()
  state.finishAfterPaint()

  expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  frames[1](0)
  frames[2](16)
  expect(onChange).toHaveBeenCalledExactlyOnceWith(false)
  state.destroy()
})

it('should cancel a pending frame and allow an omitted listener', () => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 42),
  )
  const state = new SceneLoadingState(undefined)
  state.finishAfterPaint()

  state.start()
  state.finish()
  state.destroy()

  expect(cancelAnimationFrame).toHaveBeenCalledWith(42)
})
