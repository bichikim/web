/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createPlayer, preparePuppetDocument} from '@winter-love/puppet/player'
import {useCharacterPreview} from '..'
import {connectCharacterBlink} from '../blink'

const player = vi.hoisted(() => ({
  clearParameterValues: vi.fn(),
  destroy: vi.fn(),
  getParameterValue: vi.fn(() => 0),
  patchParameterBlends: vi.fn(),
  patchParameterValues: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  setBreath: vi.fn(),
  setExpression: vi.fn(),
  setEyeBlink: vi.fn(),
  setMotion: vi.fn(),
  setPhysicsPreview: vi.fn(),
}))
vi.mock('@winter-love/puppet/player', () => ({
  createPlayer: vi.fn(),
  preparePuppetDocument: vi.fn(),
}))
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

const actual = await vi.importActual<typeof import('@winter-love/puppet/player')>(
  '@winter-love/puppet/player',
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

test('should pass the native Poffo download to its validation Worker without gzip or JSON text', async () => {
  const text = vi.spyOn(Response.prototype, 'text')
  const hook = setup()
  await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce(), {interval: 1})
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

test('should not create a player when unmounted while its Blob is being prepared', async () => {
  const prepared = await preparePuppetDocument({document: preparedDocument})
  vi.mocked(preparePuppetDocument).mockClear()
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof preparePuppetDocument>>>()
  vi.mocked(preparePuppetDocument).mockReturnValueOnce(pending.promise)
  const hook = setup()
  await waitFor(() => expect(preparePuppetDocument).toHaveBeenCalledOnce(), {interval: 1})
  const options = vi.mocked(preparePuppetDocument).mock.calls[0]![0]
  hook.cleanup()
  expect(options.signal?.aborted).toBe(true)
  pending.resolve(prepared)
  await pending.promise
  expect(createPlayer).not.toHaveBeenCalled()
})

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
    ParamAngleX: {mode: 'overwrite', value: 30},
    ParamAngleY: {mode: 'overwrite', value: 0},
    ParamEyeBallX: {mode: 'overwrite', value: 1},
    ParamEyeBallY: {mode: 'overwrite', value: 0},
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
