import {Blob as NodeBlob} from 'node:buffer'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {getSpeechCacheKey} from '../configuration'
import {prepareSpeechPlayback} from '../prepare-playback'
import type {SpeechCache} from '../types'
let cache: SpeechCache
const resources = () => ({
  cache,
  fetch: vi.fn(),
  getCacheKey: (text: string) => getSpeechCacheKey(text, crypto.subtle),
})

const mp3 = new NodeBlob([Uint8Array.of(255, 251, 144)], {type: 'audio/mpeg'}) as unknown as Blob
const samples = new Float32Array(1000).fill(0.1)
const decoded = {
  duration: 1,
  getChannelData: () => samples,
  sampleRate: 1000,
} as unknown as AudioBuffer
const mouth = {duration: 1, frames: new Float32Array(102), step: 0.02}

beforeEach(() => {
  cache = {
    read: vi.fn().mockResolvedValue({ok: true, value: null}),
    remove: vi.fn().mockResolvedValue({ok: true, value: undefined}),
    write: vi.fn().mockResolvedValue({ok: true, value: undefined}),
  }
})
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

test('should commit MP3 with decoded-audio mouth frames before playback', async () => {
  const committed = Promise.withResolvers<Awaited<ReturnType<typeof cache.write>>>()
  vi.mocked(cache.write).mockReturnValue(committed.promise)
  const generate = vi.fn().mockResolvedValue(mp3)
  const context = {decodeAudioData: vi.fn().mockResolvedValue(decoded)}
  const ready = vi.fn()
  const result = prepareSpeechPlayback({
    ...resources(),
    context,
    generate,
    input: ' 안녕 ',
    signal: new AbortController().signal,
  }).then(ready)
  await vi.waitFor(() => expect(cache.write).toHaveBeenCalledOnce(), {interval: 1})
  expect(ready).not.toHaveBeenCalled()
  expect(generate).toHaveBeenCalledExactlyOnceWith('안녕')
  expect(cache.write).toHaveBeenCalledWith(
    expect.stringMatching(/^[a-f0-9]{64}$/),
    expect.objectContaining({audio: mp3, mouth: expect.objectContaining({duration: 1})}),
  )
  committed.resolve({ok: true, value: undefined})
  await result
  expect(ready).toHaveBeenCalledWith(expect.objectContaining({audio: decoded}))
})

test('should replay a cached MP3 with its saved mouth track without creating speech', async () => {
  vi.mocked(cache.read).mockResolvedValue({ok: true, value: {audio: mp3, mouth}})
  const generate = vi.fn()
  const context = {decodeAudioData: vi.fn().mockResolvedValue(decoded)}
  const playback = await prepareSpeechPlayback({
    ...resources(),
    context,
    generate,
    input: '안녕',
    signal: new AbortController().signal,
  })
  expect(playback.audio).toBe(decoded)
  expect(playback.mouth).toBe(mouth)
  expect(generate).not.toHaveBeenCalled()
  expect(cache.write).not.toHaveBeenCalled()
})

test('should discard a corrupt MP3 and regenerate both audio and mouth frames', async () => {
  vi.mocked(cache.read).mockResolvedValue({ok: true, value: {audio: mp3, mouth}})
  const generate = vi.fn().mockResolvedValue(mp3)
  const context = {
    decodeAudioData: vi
      .fn()
      .mockRejectedValueOnce(new Error('Invalid MP3'))
      .mockResolvedValue(decoded),
  }
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  await prepareSpeechPlayback({
    ...resources(),
    context,
    generate,
    input: '안녕',
    signal: new AbortController().signal,
  })
  expect(cache.remove).toHaveBeenCalledOnce()
  expect(generate).toHaveBeenCalledOnce()
  expect(cache.write).toHaveBeenCalledOnce()
  warn.mockRestore()
})

test('should play and report missing persistence when storage is unavailable', async () => {
  vi.mocked(cache.read).mockResolvedValue({error: 'unavailable', ok: false})
  vi.mocked(cache.write).mockResolvedValue({error: 'unavailable', ok: false})
  const generate = vi.fn().mockResolvedValue(mp3)
  const context = {decodeAudioData: vi.fn().mockResolvedValue(decoded)}
  const onCacheError = vi.fn()
  const playback = await prepareSpeechPlayback({
    ...resources(),
    context,
    generate,
    input: '안녕',
    onCacheError,
    signal: new AbortController().signal,
  })
  expect(playback.audio).toBe(decoded)
  expect(onCacheError).toHaveBeenCalled()
})

test('should not store or play audio returned after cancellation', async () => {
  const pending = Promise.withResolvers<Blob>()
  const generate = vi.fn().mockReturnValue(pending.promise)
  const context = {decodeAudioData: vi.fn()}
  const controller = new AbortController()
  const playback = prepareSpeechPlayback({
    ...resources(),
    context,
    generate,
    input: '안녕',
    signal: controller.signal,
  })
  await vi.waitFor(() => expect(generate).toHaveBeenCalledOnce(), {interval: 1})
  controller.abort()
  pending.resolve(mp3)
  return expect(
    playback.catch((cause: unknown) => {
      expect(cache.write).not.toHaveBeenCalled()
      expect(context.decodeAudioData).not.toHaveBeenCalled()
      throw cause
    }),
  ).rejects.toMatchObject({name: 'AbortError'})
})
