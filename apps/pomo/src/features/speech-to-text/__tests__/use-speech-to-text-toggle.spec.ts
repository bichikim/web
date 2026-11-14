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

import {type SpeechRecorder, type SpeechRecording} from '..'
import {failureResult, successResult} from 'src/features/result'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('toggleRecording', () => {
  it.each([
    ['an Error', new Error('start exploded'), 'start exploded'],
    ['a non-Error', 'start exploded', '마이크 실행 오류'],
  ])('should recover when starting rejects with %s', async (_name, reason, message) => {
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn().mockRejectedValue(reason),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    root.controller.toggleRecording()
    await vi.waitFor(() => expect(root.controller.errorMessage()).toBe(message))

    expect(root.controller.activity()).toBe('idle')
    root.dispose()
  })

  it.each([
    ['an Error', new Error('stop exploded'), 'stop exploded'],
    ['a non-Error', 'stop exploded', '음성 처리 오류'],
  ])('should recover when stopping rejects with %s', async (_name, reason, message) => {
    const recording = createRecording()
    vi.mocked(recording.stop).mockRejectedValue(reason)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    await root.controller.startRecording()

    root.controller.toggleRecording()
    await vi.waitFor(() => expect(root.controller.errorMessage()).toBe(message))

    expect(root.controller.activity()).toBe('idle')
    root.dispose()
  })

  it('should ignore activity changes while a start request is pending', () => {
    const startResult = createDeferred<Awaited<ReturnType<SpeechRecorder['start']>>>()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    root.controller.toggleRecording()
    root.controller.toggleRecording()

    expect(root.controller.activity()).toBe('requesting')
    expect(recorder.start).toHaveBeenCalledTimes(1)
    root.dispose()
  })

  it('should ignore a start rejection after disposal', async () => {
    const startResult = createDeferred<Awaited<ReturnType<SpeechRecorder['start']>>>()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    root.controller.toggleRecording()
    root.dispose()
    startResult.reject(new Error('late start failure'))
    await Promise.resolve()
    await Promise.resolve()

    expect(root.controller.errorMessage()).toBeNull()
  })

  it('should ignore a stop rejection after disposal', async () => {
    const stopResult = createDeferred<Awaited<ReturnType<SpeechRecording['stop']>>>()
    const recording = createRecording()
    vi.mocked(recording.stop).mockReturnValue(stopResult.promise)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    await root.controller.startRecording()

    root.controller.toggleRecording()
    root.dispose()
    stopResult.reject(new Error('late stop failure'))
    await Promise.resolve()
    await Promise.resolve()

    expect(root.controller.errorMessage()).toBeNull()
  })
})
