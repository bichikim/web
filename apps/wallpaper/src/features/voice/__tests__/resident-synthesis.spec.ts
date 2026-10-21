import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createSynthesis, type VoiceAudio} from '../synthesis'

const synthesis = vi.hoisted(() => ({dispose: vi.fn(), generate: vi.fn()}))
vi.mock('../synthesis', () => ({createSynthesis: vi.fn(() => synthesis)}))
const audio = {sampleRate: 24000, samples: Float32Array.of(0.2)}
const output = {status: vi.fn()}
afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})
it('should retain the loaded synthesis after its owner closes and reuse it for the next owner', async () => {
  synthesis.generate.mockResolvedValue(audio)
  const {createResidentSynthesis} = await import('../resident-synthesis')
  const first = createResidentSynthesis()
  await first.generate('첫 문장', DEFAULT_POFFO_VOICE, new AbortController().signal, output)
  first.dispose()
  const second = createResidentSynthesis()
  await second.generate('다음 문장', DEFAULT_POFFO_VOICE, new AbortController().signal, output)
  expect(createSynthesis).toHaveBeenCalledOnce()
  expect(synthesis.dispose).not.toHaveBeenCalled()
  second.dispose()
})
it('should serialize owners without sending overlapping synthesis calls to the worker client', async () => {
  const {createResidentSynthesis} = await import('../resident-synthesis')
  const pending = Promise.withResolvers<VoiceAudio>()
  const started = Promise.withResolvers<void>()
  synthesis.generate
    .mockImplementationOnce(() => {
      started.resolve()
      return pending.promise
    })
    .mockResolvedValue(audio)
  const first = createResidentSynthesis()
  const second = createResidentSynthesis()
  const old = first.generate('첫 요청', DEFAULT_POFFO_VOICE, new AbortController().signal, output)
  await started.promise
  const next = second.generate(
    '다음 요청',
    DEFAULT_POFFO_VOICE,
    new AbortController().signal,
    output,
  )
  expect(synthesis.generate).toHaveBeenCalledTimes(1)
  pending.resolve(audio)
  await Promise.all([old, next])
  expect(synthesis.generate.mock.calls.map(([text]) => text)).toEqual(['첫 요청', '다음 요청'])
  first.dispose()
  second.dispose()
})
it('should cancel a waiting owner immediately without cancelling another owners generation', async () => {
  const {createResidentSynthesis} = await import('../resident-synthesis')
  const pending = Promise.withResolvers<VoiceAudio>()
  const started = Promise.withResolvers<AbortSignal>()
  synthesis.generate.mockImplementationOnce((_, __, signal) => {
    started.resolve(signal)
    return pending.promise
  })
  const first = createResidentSynthesis()
  const second = createResidentSynthesis()
  const old = first.generate('유지', DEFAULT_POFFO_VOICE, new AbortController().signal, output)
  const active = await started.promise
  const next = second.generate('취소', DEFAULT_POFFO_VOICE, new AbortController().signal, output)
  const cancelled = expect(next).rejects.toMatchObject({name: 'AbortError'})
  second.dispose()
  await cancelled
  expect(active.aborted).toBe(false)
  pending.resolve(audio)
  await old
  first.dispose()
  expect(synthesis.generate).toHaveBeenCalledTimes(1)
})
it('should cancel only the disposed owners running request and leave the model resident', async () => {
  const {createResidentSynthesis} = await import('../resident-synthesis')
  const started = Promise.withResolvers<void>()
  synthesis.generate
    .mockImplementationOnce(
      (_, __, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), {once: true})
          started.resolve()
        }),
    )
    .mockResolvedValue(audio)
  const first = createResidentSynthesis()
  const old = first.generate('중지', DEFAULT_POFFO_VOICE, new AbortController().signal, output)
  const cancelled = expect(old).rejects.toMatchObject({name: 'AbortError'})
  await started.promise
  first.dispose()
  await cancelled
  const second = createResidentSynthesis()
  await expect(
    second.generate('계속', DEFAULT_POFFO_VOICE, new AbortController().signal, output),
  ).resolves.toEqual(audio)
  expect(createSynthesis).toHaveBeenCalledOnce()
  expect(synthesis.dispose).not.toHaveBeenCalled()
  second.dispose()
})
it('should continue after generation failure and reject requests from a disposed owner', async () => {
  const {createResidentSynthesis} = await import('../resident-synthesis')
  synthesis.generate.mockRejectedValueOnce(new Error('실패')).mockResolvedValue(audio)
  const first = createResidentSynthesis()
  await expect(
    first.generate('실패', DEFAULT_POFFO_VOICE, new AbortController().signal, output),
  ).rejects.toThrow('실패')
  first.dispose()
  await expect(
    first.generate('닫힘', DEFAULT_POFFO_VOICE, new AbortController().signal, output),
  ).rejects.toThrow('종료')
  const second = createResidentSynthesis()
  await expect(
    second.generate('다음', DEFAULT_POFFO_VOICE, new AbortController().signal, output),
  ).resolves.toEqual(audio)
  second.dispose()
})

it('should reject an already cancelled request without preparing any model', async () => {
  const {createResidentSynthesis} = await import('../resident-synthesis')
  const client = createResidentSynthesis()
  const cancelled = AbortSignal.abort()
  await expect(
    client.generate('취소됨', DEFAULT_POFFO_VOICE, cancelled, output),
  ).rejects.toMatchObject({name: 'AbortError'})
  expect(createSynthesis).not.toHaveBeenCalled()
  client.dispose()
})
