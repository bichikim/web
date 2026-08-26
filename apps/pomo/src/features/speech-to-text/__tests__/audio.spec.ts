import {beforeEach, expect, it, vi} from 'vitest'

import {decodeSpeechRecording} from '../audio'

const arrayBuffer = new ArrayBuffer(4)
const close = vi.fn(async () => undefined)
const decodeAudioData = vi.fn()
const connect = vi.fn()
const start = vi.fn()
const createBufferSource = vi.fn(() => ({buffer: null, connect, start}))
const getChannelData = vi.fn(() => new Float32Array([0.25, -0.5]))
const startRendering = vi.fn(async () => ({getChannelData}))
const offlineContexts: Array<{channels: number; frames: number; rate: number}> = []

class TestAudioContext {
  close = close
  decodeAudioData = decodeAudioData
}

class TestOfflineAudioContext {
  readonly createBufferSource = createBufferSource
  readonly destination = {}
  readonly startRendering = startRendering

  constructor(channels: number, frames: number, rate: number) {
    offlineContexts.push({channels, frames, rate})
  }
}

const recording = {arrayBuffer: vi.fn(async () => arrayBuffer)} as unknown as Blob

beforeEach(() => {
  vi.clearAllMocks()
  offlineContexts.length = 0
  vi.stubGlobal('AudioContext', TestAudioContext)
  vi.stubGlobal('OfflineAudioContext', TestOfflineAudioContext)
})

it.each([
  [0, 1],
  [0.0011, 18],
] as const)('should decode and resample a %s-second recording', async (duration, frames) => {
  const decodedBuffer = {duration}
  decodeAudioData.mockResolvedValue(decodedBuffer)

  await expect(decodeSpeechRecording(recording)).resolves.toEqual(new Float32Array([0.25, -0.5]))
  expect(offlineContexts).toEqual([{channels: 1, frames, rate: 16_000}])
  expect(createBufferSource.mock.results[0]?.value.buffer).toBe(decodedBuffer)
  expect(connect).toHaveBeenCalledWith(expect.any(Object))
  expect(start).toHaveBeenCalledOnce()
  expect(getChannelData).toHaveBeenCalledWith(0)
  expect(close).toHaveBeenCalledOnce()
})

it('should close the decoding context after a failure', async () => {
  decodeAudioData.mockRejectedValue(new Error('decode failed'))

  await expect(decodeSpeechRecording(recording)).rejects.toThrow('decode failed')
  expect(close).toHaveBeenCalledOnce()
})
