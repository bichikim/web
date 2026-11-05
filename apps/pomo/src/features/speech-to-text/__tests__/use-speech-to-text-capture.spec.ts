import {
  createRecognizer,
  createRecording,
  createRuntime,
  createSpeechRoot,
} from './fixtures/runtime'
import {createDeferred} from 'src/__tests__/create-deferred'
import {afterEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  createBrowserSpeechRecorder: vi.fn(),
  createSpeechRecognizer: vi.fn(),
}))

vi.mock('../browser-recorder', () => ({
  createBrowserSpeechRecorder: dependencyMocks.createBrowserSpeechRecorder,
}))

vi.mock('../client', () => ({createSpeechRecognizer: dependencyMocks.createSpeechRecognizer}))

import {type SpeechRecorder, type SpeechRecording, useSpeechToText} from '..'
import {failureResult, successResult} from 'src/features/result'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useSpeechToText', () => {
  it('should prevent duplicate capture while microphone permission is pending', async () => {
    const startResult = createDeferred<ReturnType<typeof successResult<SpeechRecording>>>()
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    const firstStart = root.controller.startRecording()
    const secondStart = root.controller.startRecording()
    expect(root.controller.activity()).toBe('requesting')
    expect(recorder.start).toHaveBeenCalledTimes(1)

    startResult.resolve(successResult(recording))
    await Promise.all([firstStart, secondStart])
    expect(root.controller.activity()).toBe('recording')
    root.dispose()
    expect(recording.cancel).toHaveBeenCalledTimes(1)
  })

  it('should prepare, transcribe, append text, and release owned resources', async () => {
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const recognizer = createRecognizer()
    const onTranscript = vi.fn()
    const root = createSpeechRoot(createRuntime(recorder, recognizer), {onTranscript})

    root.controller.setText('기존 문장')
    await root.controller.startRecording()
    expect(onTranscript).not.toHaveBeenCalled()
    await root.controller.stopRecording()

    expect(recognizer.prepare).toHaveBeenCalledTimes(1)
    expect(recognizer.transcribe).toHaveBeenCalledWith({
      audio: expect.any(Float32Array),
      language: 'korean',
    })
    expect(root.controller.text()).toBe('기존 문장 테스트 문장')
    expect(onTranscript).toHaveBeenCalledWith('테스트 문장')
    expect(root.controller.activity()).toBe('idle')
    root.dispose()
    expect(recognizer.dispose).toHaveBeenCalledTimes(1)
  })

  it('should transcribe a detected speech segment without stopping the microphone', async () => {
    let onSpeechEnd: () => void = () => undefined
    const recording = createRecording()
    vi.mocked(recording.onSpeechEnd).mockImplementation((handler) => {
      onSpeechEnd = handler
      return vi.fn()
    })
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const recognizer = createRecognizer()
    const onTranscript = vi.fn()
    const root = createSpeechRoot(createRuntime(recorder, recognizer), {
      endpointing: () => true,
      onTranscript,
    })

    await root.controller.startRecording()
    onSpeechEnd()

    await vi.waitFor(() => expect(onTranscript).toHaveBeenCalledWith('테스트 문장'))
    expect(recording.takeSegment).toHaveBeenCalledTimes(1)
    expect(recording.stop).not.toHaveBeenCalled()
    expect(root.controller.activity()).toBe('recording')

    await root.controller.stopRecording()
    expect(recording.stop).toHaveBeenCalledTimes(1)
    expect(recognizer.transcribe).toHaveBeenCalledTimes(2)
    expect(root.controller.activity()).toBe('idle')
    root.dispose()
  })

  it('should expose capture and recognition failures as stable user states', async () => {
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () =>
        failureResult({code: 'permission-denied' as const, retryable: true}),
      ),
    }
    const recognizer = createRecognizer()
    const root = createSpeechRoot(createRuntime(recorder, recognizer))

    await root.controller.startRecording()
    expect(root.controller.activity()).toBe('idle')
    expect(root.controller.errorMessage()).toContain('마이크 권한')
    expect(recognizer.prepare).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should cancel a capture that resolves after disposal', async () => {
    const startResult = createDeferred<ReturnType<typeof successResult<SpeechRecording>>>()
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    const start = root.controller.startRecording()

    root.dispose()
    startResult.resolve(successResult(recording))
    await start

    expect(recording.cancel).toHaveBeenCalledTimes(1)
  })

  it('should ignore a capture failure that resolves after disposal', async () => {
    const startResult = createDeferred<Awaited<ReturnType<SpeechRecorder['start']>>>()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    const start = root.controller.startRecording()

    root.dispose()
    startResult.resolve(failureResult({code: 'capture-failed', retryable: true}))
    await start

    expect(root.controller.errorMessage()).toBeNull()
  })
})
