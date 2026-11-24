import {afterEach, expect, test, vi} from 'vitest'
import {createJointDrag} from '../create-joint-drag'

afterEach(() => vi.unstubAllGlobals())

test('should prioritize the wrist, settle without pointer movement and cancel pending frames', () => {
  let frame: FrameRequestCallback = () => undefined
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback) => {
      frame = callback
      return 1
    }),
  )
  const cancelled = vi.fn()
  vi.stubGlobal('cancelAnimationFrame', cancelled)
  let values: Readonly<Record<string, number>> = {elbow: 0, shoulder: 0, wrist: 0}
  let offsets = values
  let goal = 10
  const write = vi.fn((next) => {
    offsets = next
    values = next
  })
  const drag = createJointDrag({
    drag: {solve: () => ({elbow: goal, shoulder: goal, wrist: goal})},
    offsets: () => offsets,
    parameterIds: ['shoulder', 'elbow', 'wrist'],
    response: [0.25, 0.6, 1],
    values: () => values,
    write,
  })
  drag.move({x: 20, y: 30})
  expect(values.wrist).toBe(10)
  expect(values.elbow).toBeGreaterThan(values.shoulder!)
  expect(values.elbow).toBeLessThan(10)
  frame(0)
  frame(5000)
  expect(values).toEqual({elbow: 10, shoulder: 10, wrist: 10})
  goal = 20
  drag.move({x: 40, y: 60})
  drag.cancel()
  expect(cancelled).toHaveBeenCalled()
  const count = write.mock.calls.length
  frame(6000)
  expect(write).toHaveBeenCalledTimes(count)
})

test('should keep zero-response joints fixed and retain the underlying pose when writing offsets', () => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const write = vi.fn()
  const drag = createJointDrag({
    drag: {solve: () => ({elbow: 10, shoulder: 20, wrist: 15})},
    offsets: () => ({elbow: 1}),
    parameterIds: ['shoulder', 'elbow', 'wrist'],
    response: [0, 1, 1],
    values: () => ({elbow: 3, shoulder: 4, wrist: 5}),
    write,
  })
  drag.move({x: 20, y: 30})
  expect(write).toHaveBeenCalledWith({elbow: 8, shoulder: 0, wrist: 10})
  drag.cancel()
})
