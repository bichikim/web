/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createPlayer, type Player} from '@winter-love/puppet/player'
import {preparePuppetDocument} from '@winter-love/puppet/prepare-document'
import {useCharacterPreview} from '..'
import {connectCharacterBlink} from '../blink'
import {startInitialCharacterDocument} from '../model'

const player = vi.hoisted(() => ({
  clearParameterValues: vi.fn(),
  destroy: vi.fn(),
  getParameterValue: vi.fn(() => 0),
  patchParameterBlends: vi.fn(),
  patchParameterValues: vi.fn(),
  pause: vi.fn(),
  pickPart: vi.fn<Player['pickPart']>(),
  resume: vi.fn(),
  setBreath: vi.fn(),
  setExpression: vi.fn(),
  setExpressionLayer: vi.fn(),
  setEyeBlink: vi.fn(),
  setMotion: vi.fn(),
  setPhysicsPreview: vi.fn(),
}))
vi.mock('@winter-love/puppet/player', () => ({
  createPlayer: vi.fn(),
}))
vi.mock('@winter-love/puppet/prepare-document', () => ({preparePuppetDocument: vi.fn()}))
vi.mock('../blink', () => ({connectCharacterBlink: vi.fn()}))
const releaseBlink = vi.fn()
const preparedDocument = {
  format: 'winter-love-poffo',
  motions: [],
  parameters: ['ParamAngleX', 'ParamAngleY', 'ParamEyeBallX', 'ParamEyeBallY'].map((id) => ({
    defaultValue: 0,
    id,
    maximum: id.includes('Angle') ? 30 : 1,
    minimum: id.includes('Angle') ? -30 : -1,
    name: id,
  })),
  parts: [],
  version: 1,
  viewport: {height: 6000, width: 4800},
}
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 0
const settle = () => {
  for (let index = 0; index < 120; index += 1) {
    const pending = [...frames]
    frames.clear()
    for (const [, callback] of pending) {
      callback((index * 1000) / 60)
    }
  }
}

const actual = await vi.importActual<typeof import('@winter-love/puppet/prepare-document')>(
  '@winter-love/puppet/prepare-document',
)
const prepared = await actual.preparePuppetDocument({document: preparedDocument})
if (!prepared.ok) {
  throw new Error('Invalid character fixture')
}

beforeEach(() => {
  frames.clear()
  nextFrame = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextFrame += 1
    frames.set(nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => frames.delete(handle))
  vi.mocked(createPlayer, {partial: true}).mockResolvedValue(player)
  vi.mocked(preparePuppetDocument).mockResolvedValue(prepared)
  vi.mocked(connectCharacterBlink).mockReturnValue(releaseBlink)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}')),
  )
  vi.stubGlobal('devicePixelRatio', 1)
  vi.stubGlobal(
    'DecompressionStream',
    vi.fn().mockImplementation(function decompression() {
      return new TransformStream()
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const setup = () => {
  const canvas = document.createElement('canvas')
  return renderHook(() => useCharacterPreview({canvas: () => canvas, playing: () => true}))
}

test.each([
  ['/?worker=javascript', 'javascript'],
  ['/', 'rust'],
  ['/?worker=rust', 'rust'],
  ['/?worker=unknown', 'rust'],
])('should select the playback Worker for %s', async (url, workerRuntime) => {
  const previousUrl = location.href
  history.replaceState(history.state, '', url)
  try {
    setup()
    await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce(), {interval: 1})
    expect(createPlayer).toHaveBeenCalledWith(expect.objectContaining({workerRuntime}))
  } finally {
    history.replaceState(history.state, '', previousUrl)
  }
})

test('should pass the native Poffo download to its validation Worker without gzip or JSON text', async () => {
  const text = vi.spyOn(Response.prototype, 'text')
  const hook = setup()
  await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce(), {interval: 1})
  expect(createPlayer).toHaveBeenCalledWith(expect.objectContaining({buffering: true}))
  const options = vi.mocked(preparePuppetDocument).mock.calls[0]![0]
  expect(fetch).toHaveBeenCalledWith('/models/white-cat/model.poffo', expect.any(Object))
  expect(text).not.toHaveBeenCalled()
  if (!('source' in options) || typeof options.source === 'string') {
    throw new Error('Expected a Blob source')
  }
  expect(options.source).toBeInstanceOf(Blob)
  expect(options.source.size).toBe(2)
  expect(DecompressionStream).not.toHaveBeenCalled()
  hook.cleanup()
  expect(player.destroy).toHaveBeenCalledOnce()
  expect(releaseBlink).toHaveBeenCalledOnce()
})

test('should keep clothing separate from the selected expression', async () => {
  const [coatOff, setCoatOff] = createSignal(false)
  const [expressionId, setExpression] = createSignal<string | null>('손하트')
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    useCharacterPreview({canvas: () => canvas, coatOff, expressionId, playing: () => true}),
  )
  await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce(), {interval: 1})
  setCoatOff(true)
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith('outfit', '외투 벗기')
  expect(player.setExpression).toHaveBeenLastCalledWith('손하트')
  setExpression('커피 들기')
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith('outfit', '외투 벗기')
  setCoatOff(false)
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith('outfit', undefined)
  expect(player.setExpression).toHaveBeenLastCalledWith('커피 들기')
  hook.cleanup()
})

test('should announce a rendered character only after its input connections are ready', async () => {
  const pending = Promise.withResolvers<typeof player>()
  vi.mocked(createPlayer, {partial: true}).mockReturnValueOnce(pending.promise)
  const ready = vi.fn()
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    useCharacterPreview({canvas: () => canvas, onReady: ready, playing: () => true}),
  )
  await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce(), {interval: 1})
  vi.mocked(createPlayer).mock.calls[0]![0].onFrame?.({duration: 0, motionId: null, time: 0})
  expect(ready).not.toHaveBeenCalled()
  pending.resolve(player)
  await waitFor(() => expect(ready).toHaveBeenCalledOnce(), {interval: 1})
  vi.mocked(createPlayer).mock.calls[0]![0].onFrame?.({duration: 0, motionId: null, time: 0})
  expect(ready).toHaveBeenCalledOnce()
  hook.cleanup()
})

test('should hit only a painted part using canvas-local pointer coordinates', async () => {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 480, 600))
  const hook = renderHook(() => useCharacterPreview({canvas: () => canvas, playing: () => true}))
  await waitFor(() => expect(player.setPhysicsPreview).toHaveBeenCalledWith(true), {interval: 1})
  vi.mocked(player.pickPart).mockReturnValue('body')
  expect(hook.result.hitTest({clientX: 340, clientY: 350})).toBe(true)
  expect(player.pickPart).toHaveBeenLastCalledWith({x: 240, y: 300})
  vi.mocked(player.pickPart).mockReturnValue(undefined)
  expect(hook.result.hitTest({clientX: 110, clientY: 60})).toBe(false)
  player.pickPart.mockClear()
  expect(hook.result.hitTest({clientX: 99, clientY: 350})).toBe(false)
  expect(player.pickPart).not.toHaveBeenCalled()
  hook.cleanup()
})

test.each([false, true])(
  'should cancel pending preparation on unmount when the model started before mounting is %s',
  async (startedEarly) => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof preparePuppetDocument>>>()
    vi.mocked(preparePuppetDocument).mockReturnValueOnce(pending.promise)
    if (startedEarly) {
      startInitialCharacterDocument()
      await waitFor(() => expect(preparePuppetDocument).toHaveBeenCalledOnce(), {interval: 1})
    }
    const hook = setup()
    await waitFor(() => expect(preparePuppetDocument).toHaveBeenCalledOnce(), {interval: 1})
    expect(fetch).toHaveBeenCalledOnce()
    const options = vi.mocked(preparePuppetDocument).mock.calls[0]![0]
    hook.cleanup()
    expect(options.signal?.aborted).toBe(true)
    pending.resolve(prepared)
    await pending.promise
    expect(createPlayer).not.toHaveBeenCalled()
  },
)

test('should aim around the translated face in canvas CSS pixels and reset on pointer exit', async () => {
  const canvas = document.createElement('canvas')
  let left = 100
  vi.spyOn(canvas, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(left, 50, 480, 600),
  )
  const hook = renderHook(() => useCharacterPreview({canvas: () => canvas, playing: () => true}))
  await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce(), {interval: 1})
  const point = {x: 440.0060493, y: 143.884641}
  hook.result.lookAt(point)
  settle()
  expect(player.patchParameterBlends.mock.calls.at(-1)![0].ParamEyeBallX.value).toBeGreaterThan(0)
  expect(player.patchParameterBlends.mock.calls.at(-1)![0].ParamEyeBallY.value).toBeCloseTo(0)
  left = 300
  hook.result.lookAt(point)
  settle()
  expect(player.patchParameterBlends.mock.calls.at(-1)![0].ParamEyeBallX.value).toBeLessThan(0)
  hook.result.lookAt()
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({
    ParamAngleX: undefined,
    ParamAngleY: undefined,
    ParamEyeBallX: undefined,
    ParamEyeBallY: undefined,
  })
  expect(frames.size).toBe(0)
  hook.cleanup()
})

test('should smoothly reach model limits and leave idle animation free when tracking is released', async () => {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 480, 600))
  const hook = renderHook(() => useCharacterPreview({canvas: () => canvas, playing: () => true}))
  await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce(), {interval: 1})
  expect(player.setMotion).toHaveBeenCalledWith('Idle:0')
  hook.result.lookAt({x: 940.0060493, y: 143.884641})
  expect(frames.size).toBe(1)
  settle()
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({
    ParamAngleX: {mode: 'add', value: 30},
    ParamAngleY: {mode: 'add', value: 0},
    ParamEyeBallX: {mode: 'add', value: 1},
    ParamEyeBallY: {mode: 'add', value: 0},
  })
  expect(frames.size).toBe(0)
  hook.result.lookAt({x: -259.9939507, y: 143.884641})
  settle()
  expect(player.patchParameterBlends.mock.lastCall![0].ParamAngleX.value).toBe(-30)
  hook.result.lookAt({x: 340.0060493, y: -456.115359})
  settle()
  expect(player.patchParameterBlends.mock.lastCall![0].ParamAngleY.value).toBe(30)
  expect(player.patchParameterBlends.mock.lastCall![0].ParamEyeBallY.value).toBe(1)
  hook.result.lookAt({x: 340.0060493, y: 743.884641})
  settle()
  expect(player.patchParameterBlends.mock.lastCall![0].ParamAngleY.value).toBe(-30)
  expect(player.patchParameterBlends.mock.lastCall![0].ParamEyeBallY.value).toBe(-1)
  hook.result.lookAt({x: 100, y: 100})
  hook.cleanup()
  expect(frames.size).toBe(0)
  expect(player.patchParameterValues).not.toHaveBeenCalled()
})
