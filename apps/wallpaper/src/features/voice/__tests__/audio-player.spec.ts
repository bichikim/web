import {afterEach, expect, it, vi} from 'vitest'
import {createAudioPlayer} from '../audio-player'

import {AudioRuntime} from './fixtures/audio-runtime'

const audio = {sampleRate: 10, samples: new Float32Array(5)}
it('should notify observers after scheduling the source on the audio clock', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const onScheduled = vi.fn(() => {
    expect(AudioRuntime.instances[0].sources[0].start).toHaveBeenCalledWith(3.25)
  })
  const played = player.enqueue(audio, 80, new AbortController().signal, {onScheduled})
  await Promise.resolve()
  expect(onScheduled).toHaveBeenCalledOnce()
  AudioRuntime.instances[0].sources[0].onended!()
  await played
  player.dispose()
})
it('should pause scheduled audio and queue new chunks without resuming or restarting sources', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const first = player.enqueue(audio, 80, new AbortController().signal)
  await Promise.resolve()
  const runtime = AudioRuntime.instances[0]
  await player.setPaused(true)
  const next = player.enqueue(audio, 80, new AbortController().signal)
  await Promise.resolve()
  expect(runtime.suspend).toHaveBeenCalled()
  expect(runtime.resume).toHaveBeenCalledOnce()
  expect(runtime.sources[1].start).toHaveBeenCalledWith(3.75)
  await player.setPaused(false)
  expect(runtime.resume).toHaveBeenCalledTimes(2)
  for (const source of runtime.sources) {
    expect(source.stop).not.toHaveBeenCalled()
    expect(source.start).toHaveBeenCalledOnce()
    source.onended!()
  }
  await Promise.all([first, next])
  player.dispose()
})
it('should preserve a pause requested before the first audio is ready', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  await player.setPaused(true)
  expect(AudioRuntime.instances).toHaveLength(0)
  const pending = player.enqueue(audio, 80, new AbortController().signal)
  await Promise.resolve()
  const runtime = AudioRuntime.instances[0]
  expect(runtime.resume).not.toHaveBeenCalled()
  expect(runtime.suspend).toHaveBeenCalledOnce()
  await player.setPaused(false)
  expect(runtime.sources[0].start).toHaveBeenCalledOnce()
  runtime.sources[0].onended!()
  await pending
  player.dispose()
})
it('should restore playback after a rejected pause instead of pausing future chunks', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const first = player.enqueue(audio, 80, new AbortController().signal)
  await Promise.resolve()
  const runtime = AudioRuntime.instances[0]
  runtime.suspend.mockRejectedValueOnce(new Error('suspend failed'))
  await expect(player.setPaused(true)).rejects.toThrow('suspend failed')
  const next = player.enqueue(audio, 80, new AbortController().signal)
  await Promise.resolve()
  expect(runtime.resume).toHaveBeenCalledTimes(2)
  expect(runtime.suspend).toHaveBeenCalledOnce()
  runtime.sources.forEach((source) => source.onended!())
  await Promise.all([first, next])
  player.dispose()
})
afterEach(() => {
  AudioRuntime.instances = []
  vi.unstubAllGlobals()
})
it('should schedule adjacent clips using their actual playback speeds', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const signal = new AbortController().signal
  const first = player.enqueue(audio, 80, signal, {speed: 2})
  const next = player.enqueue(audio, 80, signal, {speed: 0.5})
  await Promise.resolve()
  const runtime = AudioRuntime.instances[0]
  expect(runtime.sources[0].playbackRate.value).toBe(2)
  expect(runtime.sources[1].playbackRate.value).toBe(0.5)
  expect(runtime.sources[0].start).toHaveBeenCalledWith(3.25)
  expect(runtime.sources[1].start).toHaveBeenCalledWith(3.5)
  runtime.sources.forEach((source) => source.onended!())
  await Promise.all([first, next])
  player.dispose()
})
it('should schedule the next chunk at the exact end of the current chunk on one audio clock', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const first = player.enqueue(audio, 80, new AbortController().signal)
  const next = player.enqueue(audio, 80, new AbortController().signal)
  await Promise.resolve()
  const runtime = AudioRuntime.instances[0]
  expect(AudioRuntime.instances).toHaveLength(1)
  expect(runtime.sources[0].start).toHaveBeenCalledWith(3.25)
  expect(runtime.sources[1].start).toHaveBeenCalledWith(3.75)
  runtime.sources.forEach((source) => source.onended!())
  await Promise.all([first, next])
  player.dispose()
  expect(runtime.close).toHaveBeenCalledOnce()
})
it('should abort both playing and queued audio then start replacement audio at the current clock', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const controller = new AbortController()
  const first = player.enqueue(audio, 80, controller.signal)
  const next = player.enqueue(audio, 80, controller.signal)
  const cancelled = Promise.all([
    expect(first).rejects.toMatchObject({name: 'AbortError'}),
    expect(next).rejects.toMatchObject({name: 'AbortError'}),
  ])
  await Promise.resolve()
  const runtime = AudioRuntime.instances[0]
  controller.abort()
  await cancelled
  expect(runtime.sources[0].stop).toHaveBeenCalledOnce()
  expect(runtime.sources[1].stop).toHaveBeenCalledOnce()
  runtime.currentTime = 3.3
  const replacement = player.enqueue(audio, 80, new AbortController().signal)
  const stopped = expect(replacement).rejects.toMatchObject({name: 'AbortError'})
  await Promise.resolve()
  expect(runtime.sources[2].start).toHaveBeenCalledWith(3.3)
  player.dispose()
  await stopped
})
it('should cancel a suspended resume immediately and reject audio-context failures', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const controller = new AbortController()
  // The first enqueue creates the lazy context before resume can be controlled.
  const pending = player.enqueue(audio, 80, controller.signal)
  const cancelled = expect(pending).rejects.toMatchObject({name: 'AbortError'})
  controller.abort()
  await cancelled
  expect(AudioRuntime.instances[0].sources[0].start).not.toHaveBeenCalled()
  AudioRuntime.instances[0].resume.mockRejectedValueOnce(new Error('audio denied'))
  await expect(player.enqueue(audio, 80, new AbortController().signal)).rejects.toThrow(
    'audio denied',
  )
  player.dispose()
})

it('should reject a scheduling failure instead of leaving playback pending', async () => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  const player = createAudioPlayer()
  const pending = player.enqueue(audio, 80, new AbortController().signal)
  AudioRuntime.instances[0].sources[0].start.mockImplementationOnce(() => {
    throw new Error('start failed')
  })
  await expect(pending).rejects.toThrow('start failed')
  player.dispose()
})
