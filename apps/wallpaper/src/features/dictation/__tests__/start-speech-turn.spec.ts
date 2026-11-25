/** @vitest-environment jsdom */
import {MicVAD} from '@ricky0123/vad-web'
import {afterEach, expect, it, vi} from 'vitest'
import {startSpeechTurn} from '../start-speech-turn'
import {createMicrophoneMeter} from '../create-microphone-meter'

vi.mock('@ricky0123/vad-web', () => ({MicVAD: {new: vi.fn()}}))
vi.mock('../create-microphone-meter', () => ({createMicrophoneMeter: vi.fn()}))
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})
const microphone = () => {
  const track = Object.assign(new EventTarget(), {stop: vi.fn()})
  const stream = {getTracks: () => [track]}
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia}})
  const close = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal(
    'AudioContext',
    class {
      close = close
      resume = vi.fn().mockResolvedValue(undefined)
    },
  )
  const destroy = vi.fn().mockResolvedValue(undefined)
  const start = vi.fn().mockResolvedValue(undefined)
  const pause = vi.fn().mockResolvedValue(undefined)
  const detector = {destroy, pause, setOptions: vi.fn(), start} as unknown as MicVAD
  vi.mocked(MicVAD.new).mockResolvedValue(detector)
  const stopMeter = vi.fn()
  vi.mocked(createMicrophoneMeter).mockReturnValue(stopMeter)
  return {close, destroy, detector, getUserMedia, pause, stopMeter, track}
}

it('should finish only on a Silero speech-end event and release input before returning 16kHz audio', async () => {
  const media = microphone()
  const capture = await startSpeechTurn(new AbortController().signal, vi.fn())
  const options = vi.mocked(MicVAD.new).mock.calls[0][0]!
  expect(options).toMatchObject({model: 'v5', redemptionMs: 1400, submitUserSpeechOnPause: false})
  expect(options.baseAssetPath).toContain('/dictation-runtime/')
  expect(options.onnxWASMBasePath).toBe(options.baseAssetPath)
  expect(media.getUserMedia).toHaveBeenCalledWith({audio: {noiseSuppression: false}})
  const audio = new Float32Array([0.1, 0.2])
  options.onVADMisfire?.()
  expect(media.track.stop).not.toHaveBeenCalled()
  options.onSpeechEnd?.(audio)
  expect(await capture.audio).toEqual(audio)
  expect(media.track.stop).toHaveBeenCalled()
  expect(media.destroy).toHaveBeenCalledOnce()
  expect(media.close).toHaveBeenCalledOnce()
  expect(media.stopMeter).toHaveBeenCalledOnce()
})

it('should immediately release input on abort and discard later speech events', async () => {
  const media = microphone()
  const controller = new AbortController()
  const capture = await startSpeechTurn(controller.signal, vi.fn())
  controller.abort()
  expect(media.track.stop).toHaveBeenCalled()
  vi.mocked(MicVAD.new).mock.calls[0][0]?.onSpeechEnd?.(new Float32Array([0.2]))
  await expect(capture.audio).rejects.toMatchObject({name: 'AbortError'})
  expect(media.destroy).toHaveBeenCalledOnce()
})

it('should release a permission grant received after cancellation without loading the detector', async () => {
  const media = microphone()
  const grant = Promise.withResolvers<MediaStream>()
  media.getUserMedia.mockReturnValue(grant.promise)
  const controller = new AbortController()
  const opening = startSpeechTurn(controller.signal)
  controller.abort()
  grant.resolve({getTracks: () => [media.track]} as unknown as MediaStream)
  await expect(opening).rejects.toMatchObject({name: 'AbortError'})
  expect(media.track.stop).toHaveBeenCalled()
  expect(MicVAD.new).not.toHaveBeenCalled()
})

it('should release input and its context when the detector cannot load', async () => {
  const media = microphone()
  vi.mocked(MicVAD.new).mockRejectedValue(new Error('missing model'))
  await expect(startSpeechTurn(new AbortController().signal)).rejects.toThrow('missing model')
  expect(media.track.stop).toHaveBeenCalled()
  expect(media.close).toHaveBeenCalledOnce()
})

it('should release the microphone immediately when cancelled during model initialization', async () => {
  const media = microphone()
  const pending = Promise.withResolvers<MicVAD>()
  const loading = Promise.withResolvers<void>()
  vi.mocked(MicVAD.new).mockImplementation(() => {
    loading.resolve()
    return pending.promise
  })
  const controller = new AbortController()
  const opening = startSpeechTurn(controller.signal)
  await loading.promise
  controller.abort()
  expect(media.track.stop).toHaveBeenCalled()
  pending.resolve(media.detector)
  await expect(opening).rejects.toMatchObject({name: 'AbortError'})
  expect(media.destroy).toHaveBeenCalledOnce()
  expect(media.close).toHaveBeenCalledOnce()
})

it('should release input if an audio context cannot be created', async () => {
  const media = microphone()
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        throw new Error('audio unavailable')
      }
    },
  )
  await expect(startSpeechTurn(new AbortController().signal)).rejects.toThrow('audio unavailable')
  expect(media.track.stop).toHaveBeenCalled()
})

it('should flush a long utterance at the recognition length limit', async () => {
  const media = microphone()
  const capture = await startSpeechTurn(new AbortController().signal)
  const options = vi.mocked(MicVAD.new).mock.calls[0][0]!
  const audio = new Float32Array(16_000 * 60)
  media.pause.mockImplementation(async () => {
    options.onSpeechEnd?.(audio)
  })
  options.onSpeechStart?.()
  options.onFrameProcessed?.({isSpeech: 1, notSpeech: 0}, audio)
  expect(media.detector.setOptions).toHaveBeenCalledWith({submitUserSpeechOnPause: true})
  expect((await capture.audio).length).toBe(audio.length)
  expect(media.track.stop).toHaveBeenCalled()
})
