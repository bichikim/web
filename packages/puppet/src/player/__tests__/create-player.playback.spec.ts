/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {Application, Container, MeshSimple, Texture} from 'pixi.js'
import {createEmptyDocument, createPlayer, parseDocument, serializeDocument} from '../index'

vi.mock('pixi.js', () => ({
  Application: vi.fn(),
  Container: vi.fn(),
  MeshSimple: vi.fn(),
  Texture: {from: vi.fn()},
}))

const source = {
  ...createEmptyDocument(),
  motions: [
    {
      duration: 2,
      id: 'idle',
      tracks: [
        {
          keyframes: [
            {time: 0, value: 0},
            {time: 2, value: 1},
          ],
          kind: 'parameter' as const,
          parameterId: 'shift',
        },
      ],
    },
    {
      duration: 1,
      id: 'mouth',
      tracks: [
        {
          keyframes: [
            {time: 0, value: 0},
            {time: 1, value: 1},
          ],
          kind: 'parameter' as const,
          parameterId: 'mouth',
        },
      ],
    },
  ],
  parameterBindings: [
    {
      id: 'shift',
      keyforms: [
        {parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 100]}], values: [0] as const},
        {parts: [{partId: 'part', vertices: [0, 0, 200, 0, 0, 100]}], values: [1] as const},
      ],
      parameterIds: ['shift'] as const,
      targetPartIds: ['part'],
    },
  ],
  parameters: [
    {defaultValue: 0, id: 'shift', maximum: 1, minimum: 0, name: 'Shift'},
    {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
  ],
  parts: [
    {
      id: 'part',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 100, 0, 0, 100]},
      texture: {height: 100, src: 'part.png', width: 100},
    },
  ],
  scene: undefined,
}
let tick: (ticker: {deltaMS: number}) => void
let vertices: Float32Array
const prepare = () => {
  const parsed = parseDocument(serializeDocument(source))
  if (!parsed.ok) {
    throw new Error('Invalid fixture')
  }
  return parsed.document
}
const setup = () => createPlayer({canvas: document.createElement('canvas'), document: prepare()})

beforeEach(() => {
  vi.mocked(Application).mockImplementation(function mockApplication() {
    return {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      screen: {height: 100, width: 100},
      stage: {addChild: vi.fn()},
      start: vi.fn(),
      stop: vi.fn(),
      ticker: {
        add: vi.fn((handler) => {
          tick = handler
        }),
      },
    } as unknown as Application
  })
  vi.mocked(Container).mockImplementation(function mockContainer() {
    return {
      addChild: vi.fn(),
      position: {set: vi.fn()},
      scale: {set: vi.fn()},
    } as unknown as Container
  })
  vi.mocked(MeshSimple).mockImplementation(function mockMesh() {
    const mesh = {
      geometry: {
        indices: new Uint32Array(),
        positions: new Float32Array(),
        uvs: new Float32Array(),
      },
      get vertices() {
        return vertices
      },
      set vertices(value: Float32Array) {
        vertices = value
      },
    }
    return mesh as unknown as MeshSimple
  })
  vi.mocked(Texture.from).mockReturnValue({destroy: vi.fn()} as unknown as Texture)
  vi.stubGlobal(
    'Image',
    class {
      decode = vi.fn().mockResolvedValue(undefined)
    },
  )
})
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('createPlayer playback API', () => {
  test('should preserve a pause requested by the first frame of playMotion', async () => {
    let pauseNext = false
    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: prepare(),
      onFrame: () => {
        if (pauseNext) {
          pauseNext = false
          player.pause()
        }
      },
    })
    pauseNext = true
    player.playMotion('mouth')
    tick({deltaMS: 500})
    expect(player.getParameterValue('mouth')).toBe(0)
    player.destroy()
  })
  test('should notify completion after a final-frame listener changes the playback weight', async () => {
    let adjusted = false
    const onComplete = vi.fn()
    const onFrame = vi.fn()
    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: prepare(),
      onFrame,
    })
    player.stop()
    const handle = player.startMotion('mouth', {loop: false, onComplete})!
    onFrame.mockImplementation(() => {
      if (!adjusted && handle.getState().status === 'finished') {
        adjusted = true
        handle.setWeight(0.5)
      }
    })
    tick({deltaMS: 1000})
    expect(onComplete).toHaveBeenCalledOnce()
    expect(player.getParameterValue('mouth')).toBe(0.5)
    player.destroy()
  })
  test('should keep independently paused motions paused when playing the selected motion', async () => {
    const player = await setup()
    const handle = player.startMotion('mouth')!
    handle.pause()
    player.play()
    tick({deltaMS: 500})
    expect(handle.getState()).toMatchObject({status: 'paused', time: 0})
    expect(player.getParameterValue('shift')).toBe(0.25)
    player.destroy()
  })
  test('should restore the selected motion immediately when played at zero speed after stopping', async () => {
    const player = await setup()
    player.stop()
    player.seek(1)
    expect(player.getParameterValue('shift')).toBe(0)
    player.play({speed: 0})
    expect(player.getParameterValue('shift')).toBe(0.5)
    expect(vertices[2]).toBeCloseTo(150)
    player.destroy()
  })
  test('should apply and release external overrides while the animation continues', async () => {
    const player = await setup()
    tick({deltaMS: 1000})
    expect(vertices[2]).toBeCloseTo(150)
    expect(player.setParameterValue('shift', 0.2)).toBe(true)
    expect(vertices[2]).toBeCloseTo(120)
    expect(player.getParameterValue('shift')).toBe(0.2)
    player.clearParameterValues(['shift'])
    expect(vertices[2]).toBeCloseTo(150)
    player.destroy()
  })
  test('should copy bulk inputs and snapshots, merge individual values, and reset defaults', async () => {
    const player = await setup()
    const values = {mouth: 0.8, shift: 0.3}
    player.setParameterValues(values)
    values.shift = 0.9
    player.seek(1)
    expect(player.getParameterValues()).toEqual({mouth: 0.8, shift: 0.3})
    const snapshot = player.getParameterValues()
    Object.assign(snapshot, {shift: 0.9})
    expect(player.getParameterValue('shift')).toBe(0.3)
    expect(player.setParameterValue('shift', 2)).toBe(true)
    expect(player.getParameterValues()).toEqual({mouth: 0.8, shift: 1})
    expect(player.setParameterValue('missing', 1)).toBe(false)
    expect(player.getParameterValue('missing')).toBeUndefined()
    player.resetParameters(['shift'])
    expect(player.getParameterValue('shift')).toBe(0)
    player.resetParameters()
    expect(player.getParameterValues()).toEqual({mouth: 0, shift: 0})
    player.clearParameterValues()
    expect(player.getParameterValue('shift')).toBe(0.5)
    player.destroy()
  })
  test('should render simultaneous motions and independently seek and stop them', async () => {
    const player = await setup()
    player.stop()
    const first = player.startMotion('idle')!
    const second = player.startMotion('mouth', {loop: false})!
    tick({deltaMS: 500})
    expect(player.getParameterValues()).toEqual({mouth: 0.5, shift: 0.25})
    expect(vertices[2]).toBeCloseTo(125)
    first.seek(1.5)
    expect(vertices[2]).toBeCloseTo(175)
    expect(second.getState().time).toBe(0.5)
    first.stop()
    expect(vertices[2]).toBeCloseTo(100)
    expect(player.getParameterValue('mouth')).toBe(0.5)
    player.destroy()
    second.resume()
    expect(second.getState().status).toBe('stopped')
  })
  test('should render weighted priorities and additive parameter changes', async () => {
    const player = await setup()
    player.seek(1)
    const handle = player.startMotion('idle', {priority: 1, weight: 0.5})!
    handle.seek(2)
    expect(vertices[2]).toBeCloseTo(175)
    const additive = player.startMotion('idle', {blend: 'add', priority: 2, weight: 0.25})!
    additive.seek(2)
    expect(vertices[2]).toBeCloseTo(200)
    player.destroy()
  })
  test('should pause and resume all motions, stop them, and cancel completion on destruction', async () => {
    const player = await setup()
    const onComplete = vi.fn()
    const handle = player.startMotion('mouth', {loop: false, onComplete})!
    player.pause()
    tick({deltaMS: 500})
    expect(handle.getState().time).toBe(0)
    player.resume()
    tick({deltaMS: 500})
    expect(handle.getState().time).toBe(0.5)
    player.stop()
    expect(handle.getState().status).toBe('stopped')
    expect(player.getParameterValue('mouth')).toBe(0)
    expect(player.startMotion('missing')).toBeUndefined()
    player.destroy()
    tick({deltaMS: 1000})
    expect(onComplete).not.toHaveBeenCalled()
    expect(player.startMotion('idle')).toBeUndefined()
  })
  test('should adjust the selected animation speed and preserve completion through pause', async () => {
    const player = await setup()
    player.setPlaybackSpeed(2)
    tick({deltaMS: 250})
    expect(player.getParameterValue('shift')).toBe(0.25)
    const onComplete = vi.fn()
    player.playMotion('mouth', {loop: false, onComplete})
    player.pause()
    player.resume()
    tick({deltaMS: 1000})
    expect(onComplete).toHaveBeenCalledOnce()
    expect(() => player.setPlaybackSpeed(NaN)).toThrow(RangeError)
    player.destroy()
  })
  test('should preserve a new playback started from the previous motion final frame notification', async () => {
    const nextComplete = vi.fn()
    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: prepare(),
      onFrame: (frame) => {
        if (frame.motionId === 'idle' && frame.time === 2) {
          player.playMotion('mouth', {loop: false, onComplete: nextComplete})
        }
      },
    })
    player.play({loop: false})
    tick({deltaMS: 2000})
    expect(nextComplete).not.toHaveBeenCalled()
    tick({deltaMS: 1000})
    expect(nextComplete).toHaveBeenCalledOnce()
    player.destroy()
  })
})
