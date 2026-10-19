import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {loadSupertonicRuntime} from '@winter-love/supertonic/runtime'
import type {SynthesisCommand, SynthesisReply} from '../protocol'

const engine = vi.hoisted(() => ({generate: vi.fn(), release: vi.fn()}))
vi.mock('@winter-love/supertonic/runtime', () => ({loadSupertonicRuntime: vi.fn(async () => ({}))}))
vi.mock('@winter-love/supertonic/sessions', () => ({
  loadSessions: vi.fn(async () => ({ok: true, value: {}})),
}))
vi.mock('../model-cache', () => ({
  createModelCache: () => ({load: vi.fn(async () => new TextEncoder().encode('{}').buffer)}),
}))
vi.mock('@winter-love/supertonic/engine', () => ({
  parseSupertonicConfig: vi.fn(() => ({ok: true, value: {}})),
  parseSupertonicIndexer: vi.fn(() => ({ok: true, value: []})),
  parseSupertonicVoice: vi.fn(() => ({ok: true, value: {}})),
  SupertonicEngine: class {
    sampleRate = 24000
    generate = engine.generate
    release = engine.release
  },
}))
const scope = globalThis as unknown as {onmessage: (event: MessageEvent<SynthesisCommand>) => void}
interface SynthesisListener {
  (reply: SynthesisReply): void
}
const fixture = async () => {
  vi.stubGlobal('navigator', {gpu: {}})
  vi.stubGlobal('onmessage', null)
  const listeners = new Map<number, SynthesisListener>()
  const post = vi.fn((reply: SynthesisReply) => {
    if (reply.type !== 'status') {
      listeners.get(reply.id)?.(reply)
    }
  })
  vi.stubGlobal('postMessage', post)
  await import('../worker')
  const send = (id: number, gpu = true) => {
    const completed = new Promise<SynthesisReply>((resolve) => {
      listeners.set(id, resolve)
    })
    scope.onmessage(
      new MessageEvent('message', {
        data: {
          id,
          text: '읽기',
          type: 'generate',
          voice: {...DEFAULT_POFFO_VOICE, gpu, model: 'full'},
        },
      }),
    )
    return completed
  }
  return {post, send}
}
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})
it('should reuse GPU sessions for successive sentences', async () => {
  engine.generate.mockResolvedValue(Float32Array.of(0.2))
  const test = await fixture()
  await expect(test.send(1)).resolves.toMatchObject({type: 'audio'})
  await expect(test.send(2)).resolves.toMatchObject({type: 'audio'})
  expect(loadSupertonicRuntime).toHaveBeenCalledExactlyOnceWith('webgpu')
  expect(engine.release).not.toHaveBeenCalled()
})
it('should retry a failed GPU inference on CPU once and reuse CPU for subsequent sentences', async () => {
  engine.generate
    .mockRejectedValueOnce(new Error('Device lost'))
    .mockResolvedValue(Float32Array.of(0.2))
  const test = await fixture()
  await expect(test.send(1)).resolves.toMatchObject({type: 'audio'})
  await expect(test.send(2)).resolves.toMatchObject({type: 'audio'})
  expect(vi.mocked(loadSupertonicRuntime).mock.calls).toEqual([['webgpu'], ['wasm']])
  expect(engine.generate).toHaveBeenCalledTimes(3)
  expect(engine.release).toHaveBeenCalledOnce()
})
it('should retain GPU sessions after cancellation without switching to CPU', async () => {
  let start: (() => void) | undefined
  const started = new Promise<void>((resolve) => {
    start = resolve
  })
  engine.generate
    .mockImplementationOnce(
      ({signal}: {signal: AbortSignal}) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), {once: true})
          start!()
        }),
    )
    .mockResolvedValue(Float32Array.of(0.2))
  const test = await fixture()
  void test.send(1)
  await started
  scope.onmessage(new MessageEvent('message', {data: {id: 1, type: 'cancel'}}))
  await expect(test.send(2)).resolves.toMatchObject({type: 'audio'})
  expect(loadSupertonicRuntime).toHaveBeenCalledExactlyOnceWith('webgpu')
  expect(engine.release).not.toHaveBeenCalled()
  expect(test.post.mock.calls.some(([reply]) => reply.id === 1 && reply.type !== 'status')).toBe(
    false,
  )
})

it('should rebuild model sessions when the GPU preference changes while reusing loaded runtimes', async () => {
  engine.generate.mockResolvedValue(Float32Array.of(0.2))
  const test = await fixture()
  await test.send(1, true)
  await test.send(2, false)
  await test.send(3, true)
  expect(vi.mocked(loadSupertonicRuntime).mock.calls).toEqual([['webgpu'], ['wasm']])
  expect(engine.release).toHaveBeenCalledTimes(2)
})
