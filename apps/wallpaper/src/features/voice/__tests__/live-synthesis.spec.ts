import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createLiveSynthesis} from '../live-synthesis'
import {SpeechConnectionError} from '../connection-error'

const {generate} = vi.hoisted(() => ({generate: vi.fn()}))
vi.mock('../live-session', () => ({generateLiveSpeech: generate}))
afterEach(() => vi.resetAllMocks())
const voice = {...DEFAULT_POFFO_VOICE, provider: 'chatgpt' as const}
const audio = {sampleRate: 48000, samples: Float32Array.of(0.1)}
it('should deliver received audio immediately and avoid replaying it on a failed stream', async () => {
  const received = vi.fn()
  generate.mockImplementationOnce(async (_, __, ___, onAudio) => {
    onAudio(audio)
    throw new SpeechConnectionError('network')
  })
  const client = createLiveSynthesis()
  await expect(
    client.generate('문장', voice, new AbortController().signal, {
      audio: received,
      status: vi.fn(),
    }),
  ).rejects.toThrow('다시 읽기')
  expect(received).toHaveBeenCalledExactlyOnceWith(audio)
  expect(generate).toHaveBeenCalledOnce()
  client.dispose()
})

it('should reconnect for silence and connection failure before returning actual audio', async () => {
  generate.mockRejectedValueOnce('silent').mockRejectedValueOnce('network').mockResolvedValue(audio)
  const client = createLiveSynthesis()
  const status = vi.fn()
  expect(
    await client.generate('읽을 문장', voice, new AbortController().signal, {status: status}),
  ).toEqual(audio)
  expect(generate).toHaveBeenCalledTimes(3)
  expect(generate.mock.calls.map(([text]) => text)).toEqual(['읽을 문장', '읽을 문장', '읽을 문장'])
  client.dispose()
})
it('should stop retrying after two fresh connections and allow a later manual attempt', async () => {
  generate.mockRejectedValue('silent')
  const client = createLiveSynthesis()
  await expect(
    client.generate('문장', voice, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toThrow('다시')
  expect(generate).toHaveBeenCalledTimes(3)
  generate.mockResolvedValueOnce(audio)
  expect(
    await client.generate('문장', voice, new AbortController().signal, {status: vi.fn()}),
  ).toEqual(audio)
  client.dispose()
})
it('should not retry invalid credentials', async () => {
  generate.mockRejectedValue('loginRequired')
  const client = createLiveSynthesis()
  await expect(
    client.generate('문장', voice, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toThrow('로그인')
  expect(generate).toHaveBeenCalledOnce()
  client.dispose()
})
it('should cancel an active attempt without retrying or accepting stale audio', async () => {
  const controller = new AbortController()
  generate.mockImplementationOnce(async () => {
    controller.abort()
    return audio
  })
  const client = createLiveSynthesis()
  await expect(
    client.generate('문장', voice, controller.signal, {status: vi.fn()}),
  ).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(generate).toHaveBeenCalledOnce()
  client.dispose()
})
it('should cancel in-flight work on disposal and reject new work', async () => {
  let pending: AbortSignal | undefined
  generate.mockImplementationOnce((_, signal: AbortSignal) => {
    pending = signal
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {once: true})
    })
  })
  const client = createLiveSynthesis()
  const result = client.generate('문장', voice, new AbortController().signal, {status: vi.fn()})
  const rejected = expect(result).rejects.toMatchObject({name: 'AbortError'})
  client.dispose()
  await rejected
  expect(pending?.aborted).toBe(true)
  await expect(
    client.generate('문장', voice, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toMatchObject({name: 'AbortError'})
})

it('should report missing ChatGPT voice settings without silently using a fixed voice or retrying', async () => {
  generate.mockRejectedValue('voiceSettings')
  const client = createLiveSynthesis()
  await expect(
    client.generate('문장', voice, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toThrow('ChatGPT 음성 설정')
  expect(generate).toHaveBeenCalledOnce()
  client.dispose()
})
