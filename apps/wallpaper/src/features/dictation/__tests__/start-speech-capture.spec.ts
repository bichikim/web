/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {startSpeechCapture} from '../start-speech-capture'
import {createMicrophoneMeter} from '../create-microphone-meter'

vi.mock('../create-microphone-meter', () => ({createMicrophoneMeter: vi.fn()}))

class FakeRecorder extends EventTarget {
  static options: MediaRecorderOptions | undefined
  static isTypeSupported = vi.fn<(mime: string) => boolean>(() => false)
  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    super()
    FakeRecorder.options = options
  }
  state = 'inactive'
  readonly start = () => {
    this.state = 'recording'
  }
  readonly stop = () => {
    this.state = 'inactive'
    this.dispatchEvent(new Event('stop'))
  }
}
const microphone = () => {
  const track = Object.assign(new EventTarget(), {stop: vi.fn()})
  const stream = {getTracks: () => [track]}
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia}})
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  return {getUserMedia, stream, track}
}
afterEach(() => {
  vi.unstubAllGlobals()
  FakeRecorder.isTypeSupported.mockReset().mockReturnValue(false)
  vi.mocked(createMicrophoneMeter).mockReset()
})

it('should prefer Opus over AAC when both encoders are supported', async () => {
  const media = microphone()
  FakeRecorder.isTypeSupported.mockReturnValue(true)
  const controller = new AbortController()
  const capture = await startSpeechCapture(controller.signal)
  expect(media.getUserMedia).toHaveBeenCalledExactlyOnceWith({audio: {noiseSuppression: false}})
  expect(FakeRecorder.options).toEqual({mimeType: 'audio/webm;codecs=opus'})
  controller.abort()
  await expect(capture.audio).rejects.toMatchObject({name: 'AbortError'})
})

it('should release a microphone granted after cancellation without starting a recorder', async () => {
  const media = microphone()
  const pending = Promise.withResolvers<typeof media.stream>()
  media.getUserMedia.mockReturnValue(pending.promise)
  const controller = new AbortController()
  const opening = startSpeechCapture(controller.signal)
  controller.abort()
  pending.resolve(media.stream)
  await expect(opening).rejects.toMatchObject({name: 'AbortError'})
  expect(media.track.stop).toHaveBeenCalledOnce()
})

it('should release every track and reject active capture when cancelled', async () => {
  const media = microphone()
  const controller = new AbortController()
  const capture = await startSpeechCapture(controller.signal)
  controller.abort()
  await expect(capture.audio).rejects.toMatchObject({name: 'AbortError'})
  expect(media.track.stop).toHaveBeenCalledOnce()
})

it('should release granted tracks when the recorder cannot be constructed', async () => {
  const media = microphone()
  vi.stubGlobal(
    'MediaRecorder',
    class BrokenRecorder {
      static isTypeSupported = () => false
      constructor() {
        throw new Error('recorder unavailable')
      }
    },
  )
  await expect(startSpeechCapture(new AbortController().signal)).rejects.toThrow(
    'recorder unavailable',
  )
  expect(media.track.stop).toHaveBeenCalledOnce()
})

it('should report interrupted devices and release their streams', async () => {
  const media = microphone()
  const capture = await startSpeechCapture(new AbortController().signal)
  media.track.dispatchEvent(new Event('ended'))
  await expect(capture.audio).rejects.toThrow('녹음이 중단됐어요.')
  expect(media.track.stop).toHaveBeenCalledOnce()
})

it('should quietly resolve an empty recording and release its meter and microphone', async () => {
  const media = microphone()
  const dispose = vi.fn()
  vi.mocked(createMicrophoneMeter).mockReturnValue(dispose)
  const onLevel = vi.fn()
  const capture = await startSpeechCapture(new AbortController().signal, onLevel)
  expect(createMicrophoneMeter).toHaveBeenCalledWith({
    onError: expect.any(Function),
    onLevel,
    stream: media.stream,
  })
  capture.stop()
  expect((await capture.audio).length).toBe(0)
  expect(dispose).toHaveBeenCalledOnce()
  expect(media.track.stop).toHaveBeenCalledOnce()
})

it('should dispose live metering when capture is cancelled', async () => {
  const media = microphone()
  const dispose = vi.fn()
  vi.mocked(createMicrophoneMeter).mockReturnValue(dispose)
  const controller = new AbortController()
  const capture = await startSpeechCapture(controller.signal, vi.fn())
  controller.abort()
  await expect(capture.audio).rejects.toMatchObject({name: 'AbortError'})
  expect(dispose).toHaveBeenCalledOnce()
  expect(media.track.stop).toHaveBeenCalledOnce()
})

it('should stop capture when its audio input meter fails', async () => {
  const media = microphone()
  const dispose = vi.fn()
  vi.mocked(createMicrophoneMeter).mockReturnValue(dispose)
  const capture = await startSpeechCapture(new AbortController().signal, vi.fn())
  vi.mocked(createMicrophoneMeter).mock.calls[0][0].onError(new Error('audio unavailable'))
  await expect(capture.audio).rejects.toThrow('녹음이 중단됐어요.')
  expect(dispose).toHaveBeenCalledOnce()
  expect(media.track.stop).toHaveBeenCalledOnce()
})
