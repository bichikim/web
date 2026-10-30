/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {
  createPlayer,
  type PreparedPuppetDocument,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import {useCharacterPreview} from '..'
import {connectCharacterBlink} from '../blink'

const player = vi.hoisted(() => ({
  clearParameterValues: vi.fn(),
  destroy: vi.fn(),
  getParameterValue: vi.fn(() => 0),
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
const preparedDocument = {viewport: {height: 1024, width: 1024}} as PreparedPuppetDocument

beforeEach(() => {
  vi.mocked(createPlayer, {partial: true}).mockResolvedValue(player)
  vi.mocked(preparePuppetDocument).mockResolvedValue({document: preparedDocument, ok: true})
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
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof preparePuppetDocument>>>()
  vi.mocked(preparePuppetDocument).mockReturnValueOnce(pending.promise)
  const hook = setup()
  await waitFor(() => expect(preparePuppetDocument).toHaveBeenCalledOnce(), {interval: 1})
  const options = vi.mocked(preparePuppetDocument).mock.calls[0]![0]
  hook.cleanup()
  expect(options.signal?.aborted).toBe(true)
  pending.resolve({document: preparedDocument, ok: true})
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
  expect(player.patchParameterValues.mock.calls.at(-1)![0].ParamEyeBallX).toBeGreaterThan(0)
  expect(player.patchParameterValues.mock.calls.at(-1)![0].ParamEyeBallY).toBeCloseTo(0)
  left = 300
  hook.result.lookAt(point)
  expect(player.patchParameterValues.mock.calls.at(-1)![0].ParamEyeBallX).toBeLessThan(0)
  hook.result.lookAt()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({
    ParamAngleX: 0,
    ParamAngleY: 0,
    ParamEyeBallX: 0,
    ParamEyeBallY: 0,
  })
  hook.cleanup()
})
