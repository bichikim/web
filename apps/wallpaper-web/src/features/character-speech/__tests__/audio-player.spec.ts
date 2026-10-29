/** @vitest-environment jsdom */
import {expect, test, vi} from 'vitest'
import {playSpeechAudio} from '../audio-player'
import {createMouthTrack} from '../mouth-track'

const createContext = () => {
  const source = {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null,
    start: vi.fn(),
    stop: vi.fn(),
  }
  const context = {
    createBuffer: vi.fn(() => ({copyToChannel: vi.fn()})),
    createBufferSource: vi.fn(() => source),
    currentTime: 0,
    destination: {},
  }
  return {context: context as unknown as AudioContext, source}
}

test('should follow the audio clock and release the mouth and nodes on playback end', async () => {
  const {context, source} = createContext()
  const frame = vi.fn()
  const cancel = vi.fn()
  const frames = {cancel, request: frame.mockReturnValue(1)}
  const onMouth = vi.fn()
  const done = playSpeechAudio({
    audio: {duration: 1} as AudioBuffer,
    context,
    frames,
    mouth: createMouthTrack({sampleRate: 1000, samples: new Float32Array(1000).fill(0.1)}, '이'),
    onMouth,
    signal: new AbortController().signal,
  })
  Object.defineProperty(context, 'currentTime', {value: 0.2})
  frame.mock.calls[0]![0]()
  expect(onMouth.mock.calls[0]![0].open).toBeGreaterThan(0.5)
  expect(onMouth.mock.calls[0]![0].form).toBeGreaterThan(0.9)
  const ended = source.onended as unknown as () => void
  ended()
  await done
  expect(source.disconnect).toHaveBeenCalledOnce()
  expect(onMouth).toHaveBeenLastCalledWith(null)
  expect(cancel).toHaveBeenCalledWith(1)
})

test('should stop scheduled audio and close the mouth immediately when cancelled', async () => {
  const {context, source} = createContext()
  const frames = {cancel: vi.fn(), request: vi.fn(() => 1)}
  const abort = new AbortController()
  const onMouth = vi.fn()
  const playback = playSpeechAudio({
    audio: {duration: 1} as AudioBuffer,
    context,
    frames,
    mouth: createMouthTrack({sampleRate: 1000, samples: new Float32Array(1000)}, '안녕'),
    onMouth,
    signal: abort.signal,
  })
  abort.abort()
  expect(source.stop).toHaveBeenCalledOnce()
  expect(source.disconnect).toHaveBeenCalledOnce()
  expect(source.onended).toBeNull()
  expect(onMouth).toHaveBeenLastCalledWith(null)
  return expect(playback).rejects.toMatchObject({name: 'AbortError'})
})
