import {afterEach, expect, it, vi} from 'vitest'
import {startMicrophone} from '../start-microphone'

const fixtures = () => {
  const track = Object.assign(new EventTarget(), {stop: vi.fn()})
  const stream = {getTracks: () => [track]}
  const processor = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onprocessorerror: null,
    port: {onmessage: null},
  }
  const input = {connect: vi.fn(() => processor), disconnect: vi.fn()}
  const context = {
    audioWorklet: {addModule: vi.fn().mockResolvedValue(undefined)},
    close: vi.fn().mockResolvedValue(undefined),
    createMediaStreamSource: vi.fn(() => input),
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
  }
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia}})
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function fixtures() {
      return context
    }),
  )
  vi.stubGlobal(
    'AudioWorkletNode',
    vi.fn(function fixtures() {
      return processor
    }),
  )
  return {context, getUserMedia, input, processor, stream, track}
}
afterEach(() => vi.unstubAllGlobals())
it('should honor the chosen device, forward PCM and release the microphone on abort', async () => {
  const test = fixtures()
  const controller = new AbortController()
  const onFrame = vi.fn()
  const stop = await startMicrophone({
    deviceId: 'studio',
    onError: vi.fn(),
    onFrame,
    signal: controller.signal,
  })
  expect(test.getUserMedia).toHaveBeenCalledWith({
    audio: {
      autoGainControl: false,
      deviceId: {exact: 'studio'},
      echoCancellation: false,
      noiseSuppression: false,
    },
  })
  const data = {sampleRate: 16000, samples: new Float32Array(640)}
  const receive = test.processor.port.onmessage as unknown as (event: {data: typeof data}) => void
  receive({data})
  expect(onFrame).toHaveBeenCalledWith(data)
  controller.abort()
  receive({data})
  expect(onFrame).toHaveBeenCalledOnce()
  expect(test.track.stop).toHaveBeenCalledOnce()
  expect(test.context.close).toHaveBeenCalledOnce()
  stop()
  expect(test.track.stop).toHaveBeenCalledOnce()
})
it('should release a late permission result and clean up a failed initialization', async () => {
  const test = fixtures()
  const controller = new AbortController()
  const pending = Promise.withResolvers<typeof test.stream>()
  test.getUserMedia.mockReturnValueOnce(pending.promise)
  const opening = startMicrophone({
    deviceId: '',
    onError: vi.fn(),
    onFrame: vi.fn(),
    signal: controller.signal,
  })
  const cancelled = expect(opening).rejects.toMatchObject({name: 'AbortError'})
  controller.abort()
  pending.resolve(test.stream)
  await cancelled
  expect(test.track.stop).toHaveBeenCalledOnce()
  expect(test.context.createMediaStreamSource).not.toHaveBeenCalled()
  test.context.audioWorklet.addModule.mockRejectedValueOnce(Error('worklet missing'))
  await expect(
    startMicrophone({
      deviceId: '',
      onError: vi.fn(),
      onFrame: vi.fn(),
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('worklet missing')
  expect(test.track.stop).toHaveBeenCalledTimes(2)
  expect(test.context.close).toHaveBeenCalledOnce()
})
