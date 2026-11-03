import {expect, test, vi} from 'vitest'
import {createRenderLoop} from '../create-render-loop'

test('should coalesce results and avoid drawing unchanged poses', () => {
  const render = vi.fn()
  const loop = createRenderLoop({externalRendering: () => false, render})
  loop.tick()
  expect(render).not.toHaveBeenCalled()
  loop.invalidate()
  loop.tick()
  loop.tick()
  expect(render).toHaveBeenCalledExactlyOnceWith(false)
  loop.invalidate()
  loop.invalidate()
  loop.tick()
  loop.tick()
  expect(render).toHaveBeenCalledTimes(2)
  loop.redraw()
  loop.tick()
  expect(render).toHaveBeenCalledTimes(3)
})

test('should preserve invalidation requested during presentation and flush it once', () => {
  const render = vi.fn()
  const loop = createRenderLoop({externalRendering: () => false, render})
  render.mockImplementationOnce(() => loop.invalidate())
  loop.invalidate()
  loop.tick()
  loop.flush()
  loop.flush()
  expect(render).toHaveBeenCalledTimes(2)
})

test('should draw active overlays continuously and clear their final frame when disabled', () => {
  let external = true
  const render = vi.fn()
  const loop = createRenderLoop({externalRendering: () => external, render})
  loop.tick()
  loop.tick()
  expect(render).toHaveBeenCalledTimes(2)
  external = false
  loop.tick()
  loop.tick()
  expect(render).toHaveBeenCalledTimes(3)
  expect(render).toHaveBeenLastCalledWith(false)
})
