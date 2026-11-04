import {
  createRecognizer,
  createRecording,
  createRuntime,
  createSpeechRoot,
} from './fixtures/runtime'
import {createDeferred} from 'src/__tests__/create-deferred'
import {getMonotonicTime} from 'src/utils/get-monotonic-time'

vi.mock('src/utils/get-monotonic-time', () => ({getMonotonicTime: vi.fn()}))

beforeEach(() => {
  vi.mocked(getMonotonicTime).mockImplementation(() => Date.now())
})

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  createBrowserSpeechRecorder: vi.fn(),
  createSpeechRecognizer: vi.fn(),
}))

vi.mock('../browser-recorder', () => ({
  createBrowserSpeechRecorder: dependencyMocks.createBrowserSpeechRecorder,
}))

vi.mock('../client', () => ({createSpeechRecognizer: dependencyMocks.createSpeechRecognizer}))

import {type SpeechRecorder} from '..'
import {failureResult, successResult} from 'src/features/result'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('recording lifecycle', () => {
  it('should expose elapsed recording time and stop an active timer', async () => {
    vi.useFakeTimers()
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    await root.controller.startRecording()
    await vi.advanceTimersByTimeAsync(500)

    vi.mocked(recorder.start).mock.calls[0][0]?.()
    expect(root.controller.elapsedTime()).toBe(0.5)
    await root.controller.stopRecording()
    const stoppedAt = root.controller.elapsedTime()
    await vi.advanceTimersByTimeAsync(500)
    vi.mocked(recorder.start).mock.calls[0][0]?.()
    expect(root.controller.elapsedTime()).toBe(stoppedAt)
    root.dispose()
  })

  it.each([-60_000, 60_000])(
    'should keep recording time independent of a %i ms clock adjustment',
    async (adjustment) => {
      vi.useFakeTimers()
      vi.setSystemTime(100_000)
      vi.mocked(getMonotonicTime).mockReturnValue(0)
      const recorder: SpeechRecorder = {
        isSupported: () => true,
        start: vi.fn(async () => successResult(createRecording())),
      }
      const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

      await root.controller.startRecording()
      await vi.advanceTimersByTimeAsync(500)
      vi.setSystemTime(100_500 + adjustment)
      vi.mocked(getMonotonicTime).mockReturnValue(1_000)
      await vi.advanceTimersByTimeAsync(500)

      vi.mocked(recorder.start).mock.calls[0][0]?.()
      expect(root.controller.elapsedTime()).toBe(1)
      root.dispose()
    },
  )

  it('should ignore a stop request when recording is inactive', async () => {
    const recorder: SpeechRecorder = {isSupported: () => true, start: vi.fn()}
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    await expect(root.controller.stopRecording()).resolves.toBeUndefined()

    expect(recorder.start).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should expose recorder stop failures and short captures', async () => {
    const failedRecording = createRecording()
    vi.mocked(failedRecording.stop).mockResolvedValue(
      failureResult({code: 'capture-failed', detail: 'microphone failed', retryable: true}),
    )
    const shortRecording = createRecording()
    vi.mocked(shortRecording.stop).mockResolvedValue(successResult(new Float32Array(3999)))
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi
        .fn()
        .mockResolvedValueOnce(successResult(failedRecording))
        .mockResolvedValueOnce(successResult(shortRecording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    await root.controller.startRecording()
    await root.controller.stopRecording()
    expect(root.controller.errorMessage()).toBe('microphone failed')

    await root.controller.startRecording()
    await root.controller.stopRecording()
    expect(root.controller.errorMessage()).toContain('녹음이 너무 짧아요')
    root.dispose()
  })

  it('should ignore a stop result that resolves after disposal', async () => {
    const stopResult = createDeferred<ReturnType<typeof successResult<Float32Array>>>()
    const recording = createRecording()
    vi.mocked(recording.stop).mockReturnValue(stopResult.promise)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    await root.controller.startRecording()

    const stopping = root.controller.stopRecording()
    root.dispose()
    stopResult.resolve(successResult(new Float32Array(4000)))
    await stopping

    expect(root.controller.activity()).toBe('processing')
  })

  it('should not restore idle after transcription completes following disposal', async () => {
    const transcription =
      createDeferred<ReturnType<typeof successResult<{backend: 'wasm'; text: string}>>>()
    const recording = createRecording()
    const recognizer = createRecognizer()
    vi.mocked(recognizer.transcribe).mockReturnValue(transcription.promise)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, recognizer))
    await root.controller.startRecording()

    const stopping = root.controller.stopRecording()
    await vi.waitFor(() => expect(recognizer.transcribe).toHaveBeenCalled())
    root.dispose()
    transcription.resolve(successResult({backend: 'wasm', text: 'late transcript'}))
    await stopping

    expect(root.controller.activity()).toBe('processing')
  })
})
