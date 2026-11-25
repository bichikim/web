/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_TOUCH, type PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import {useTouch} from '../use-touch'

const setup = () => {
  let frame: FrameRequestCallback = () => undefined
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback) => {
      frame = callback
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const player = {
    createParameterDrag: vi.fn(),
    getParameterValues: vi.fn(() => ({})),
    patchParameterBlends: vi.fn(),
    pickPart: vi.fn(() => 'face'),
    releaseParameterPhysics: vi.fn((): readonly string[] => []),
  }
  const canvas = document.createElement('canvas')
  canvas.setPointerCapture = vi.fn()
  const [options, setOptions] = createSignal<PoffoTouch>({
    ...DEFAULT_POFFO_TOUCH,
    enabled: true,
    parameters: {x: {}, y: {}, z: {}},
  })
  const event = (x = 0, y = 0, shiftKey = false) =>
    ({
      button: 0,
      clientX: x,
      clientY: y,
      ctrlKey: false,
      currentTarget: canvas,
      pointerId: 1,
      preventDefault: vi.fn(),
      shiftKey,
    }) as unknown as PointerEvent
  const {result} = renderHook(() =>
    useTouch({
      canvas: () => canvas,
      options,
      parameters: () =>
        ['x', 'y', 'z'].map((axis) => ({
          axis: axis as 'x' | 'y' | 'z',
          defaultValue: 0,
          dimensions: 3,
          id: axis,
          joint: true,
          maximum: 1,
          minimum: -1,
          parts: ['face'],
        })),
      player: () => player,
    }),
  )
  return {event, frame: (time: number) => frame(time), options, player, result, setOptions}
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should pulse connected parameters for a click and clear only its interaction layer', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.75)
  const test = setup()
  test.result.start(test.event())
  test.result.finish(test.event())
  test.result.lostCapture()
  test.frame(0)
  test.frame(225)
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.08}, y: {mode: 'add', value: 0.08}, z: {mode: 'add', value: 0.08}},
    'interaction',
  )
  test.frame(450)
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: undefined, y: undefined, z: undefined},
    'interaction',
  )
})

it('should leave every parameter unchanged until one is explicitly added', () => {
  const test = setup()
  test.setOptions({...test.options(), parameters: undefined})
  test.result.start(test.event())
  test.result.move(test.event(40, 20))
  test.result.finish(test.event(40, 20))
  test.result.start(test.event())
  test.result.finish(test.event())
  test.frame(225)
  expect(test.player.patchParameterBlends).not.toHaveBeenCalled()
})

it('should release interaction when selected parameters are removed in place by the library', () => {
  const test = setup()
  const [state, setState] = createStore<{touch: PoffoTouch}>({
    touch: {...DEFAULT_POFFO_TOUCH, enabled: true, parameters: {x: {}}},
  })
  test.setOptions(state.touch)
  test.result.start(test.event())
  test.result.move(test.event(20, 40))
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.2}},
    'interaction',
  )
  setState('touch', reconcile({...state.touch, parameters: {y: {}}}))
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith({x: undefined}, 'interaction')
  test.result.start(test.event())
  test.result.move(test.event(20, 40))
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {y: {mode: 'add', value: 0.4}},
    'interaction',
  )
})

it('should click and drag only added parameters and release them when removed', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.75)
  const test = setup()
  test.setOptions({...test.options(), parameters: {x: {axis: 'x'}}})
  test.result.start(test.event())
  test.result.finish(test.event())
  test.frame(0)
  test.frame(225)
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.08}},
    'interaction',
  )
  test.frame(450)
  test.result.start(test.event())
  test.result.move(test.event(20, 40))
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.2}},
    'interaction',
  )
  test.setOptions({...test.options(), parameters: {}})
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith({x: undefined}, 'interaction')
  test.player.patchParameterBlends.mockClear()
  test.result.start(test.event())
  test.result.move(test.event(40, 20))
  test.result.finish(test.event(40, 20))
  expect(test.player.patchParameterBlends).not.toHaveBeenCalled()
})

it('should drag X and Y, adjust Z with Shift, and return smoothly after release', () => {
  const test = setup()
  test.result.start(test.event())
  test.result.move(test.event(20, 40))
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.2}, y: {mode: 'add', value: 0.4}, z: {mode: 'add', value: 0}},
    'interaction',
  )
  test.result.move(test.event(20, 60, true))
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.2}, y: {mode: 'add', value: 0.4}, z: {mode: 'add', value: 0.2}},
    'interaction',
  )
  test.result.finish(test.event(20, 60, true))
  test.frame(0)
  test.frame(450)
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: undefined, y: undefined, z: undefined},
    'interaction',
  )
})

it('should hand physical parameters to the model and animate only the remaining offsets', () => {
  const test = setup()
  test.player.releaseParameterPhysics.mockReturnValue(['x', 'y'])
  test.result.start(test.event())
  test.result.move(test.event(20, 40))
  test.result.finish(test.event(20, 40))
  expect(test.player.releaseParameterPhysics).toHaveBeenCalledWith(['x', 'y', 'z'])
  test.frame(0)
  test.frame(225)
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {z: {mode: 'add', value: 0}},
    'interaction',
  )
  test.frame(450)
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith({z: undefined}, 'interaction')
})

it('should release a click pulse into model physics at its peak without applying it twice', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.75)
  const test = setup()
  test.player.releaseParameterPhysics.mockReturnValue(['x', 'y'])
  test.result.start(test.event())
  test.result.finish(test.event())
  test.frame(0)
  test.frame(225)
  expect(test.player.releaseParameterPhysics).toHaveBeenCalledWith(['x', 'y', 'z'])
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {z: {mode: 'add', value: 0.08}},
    'interaction',
  )
  test.frame(300)
  expect(test.player.releaseParameterPhysics).toHaveBeenCalledOnce()
  expect(Object.keys(test.player.patchParameterBlends.mock.lastCall![0])).toEqual(['z'])
})

it('should solve an opted-in joint chain from both canvas axes and release only its offsets', () => {
  const test = setup()
  test.setOptions({
    ...test.options(),
    chains: [['x', 'y', 'z']],
    inverseKinematics: true,
    jointResponse: {elbow: 1, shoulder: 1, wrist: 1},
  })
  const solve = vi.fn(() => ({x: 0.4, y: -0.2, z: -0.2}))
  test.player.createParameterDrag.mockReturnValue({solve})
  test.result.start(test.event(10, 20))
  expect(test.player.createParameterDrag).toHaveBeenCalledWith({
    mobility: [1, 1, 1],
    parameterIds: ['x', 'y', 'z'],
    point: {x: 10, y: 20},
    preserveAngle: true,
  })
  test.result.move(test.event(30, 60))
  expect(solve).toHaveBeenCalledWith({x: 30, y: 60})
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.4}, y: {mode: 'add', value: -0.2}, z: {mode: 'add', value: -0.2}},
    'interaction',
  )
  test.player.getParameterValues.mockReturnValue({x: 0.4, y: -0.2, z: -0.2})
  test.result.finish(test.event(30, 60))
  test.frame(0)
  test.frame(450)
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: undefined, y: undefined, z: undefined},
    'interaction',
  )
})

it('should not add unselected joints or solve a chain with a missing selected parameter', () => {
  const test = setup()
  test.setOptions({
    ...test.options(),
    chains: [['x', 'y', 'z']],
    inverseKinematics: true,
    parameters: {x: {}, y: {}},
  })
  test.result.start(test.event())
  test.result.move(test.event(30, 60))
  expect(test.player.createParameterDrag).not.toHaveBeenCalled()
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: 0.3}, y: {mode: 'add', value: 0.6}},
    'interaction',
  )
})

it('should use named character joints and their own weights without manual parameter selection', () => {
  const test = setup()
  test.setOptions({
    ...test.options(),
    chains: [
      {
        enabled: true,
        id: 'custom',
        name: '내 캐릭터 팔',
        parameters: {elbow: 'y', shoulder: 'x', wrist: 'z'},
        response: {elbow: 0.5, shoulder: 0.2, wrist: 1},
      },
    ],
    inverseKinematics: true,
    parameters: {},
  })
  test.player.createParameterDrag.mockReturnValue({solve: () => ({x: 0.4, y: -0.2, z: -0.2})})
  test.result.start(test.event())
  test.result.move(test.event(30, 50))
  expect(test.player.createParameterDrag).toHaveBeenCalledWith({
    mobility: [0.2, 0.5, 1],
    parameterIds: ['x', 'y', 'z'],
    point: {x: 0, y: 0},
    preserveAngle: true,
  })
  expect(test.player.patchParameterBlends).toHaveBeenCalled()
  test.setOptions({...test.options(), chains: []})
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: undefined, y: undefined, z: undefined},
    'interaction',
  )
})

it('should honor remapping, inversion, gain, limits and disabling mid-drag', () => {
  const test = setup()
  test.setOptions({
    ...test.options(),
    parameters: {x: {axis: 'y', gain: 2, invert: true}, y: {axis: 'off'}, z: {}},
  })
  test.result.start(test.event())
  test.result.move(test.event(1000, 1000))
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: {mode: 'add', value: -2}, z: {mode: 'add', value: 0}},
    'interaction',
  )
  test.setOptions({...test.options(), enabled: false})
  expect(test.player.patchParameterBlends).toHaveBeenLastCalledWith(
    {x: undefined, z: undefined},
    'interaction',
  )
})

it('should ignore transparent regions, context clicks, and disabled click or drag gestures', () => {
  const test = setup()
  test.player.pickPart.mockReturnValueOnce(undefined as unknown as string)
  test.result.start(test.event())
  test.result.finish(test.event())
  test.result.start({...test.event(), ctrlKey: true})
  expect(test.player.patchParameterBlends).not.toHaveBeenCalled()
  test.setOptions({...test.options(), click: false, drag: false})
  test.result.start(test.event())
  test.result.move(test.event(40, 20))
  test.result.finish(test.event(40, 20))
  expect(test.player.patchParameterBlends).not.toHaveBeenCalled()
})
