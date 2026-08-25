import {describe, expect, it, vi} from 'vitest'

import {createEndpointTranscription} from '../endpoint-transcription'
import type {SpeechRecording} from '../recorder'
import {failureResult, successResult} from '../../result'

const createDeferred = <Value>() => {
  let resolve: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })
  return {promise, resolve}
}

describe('createEndpointTranscription', () => {
  it('should wait for an in-flight segment before stopping and preserve transcription order', async () => {
    const segment = Float32Array.of(1)
    const finalSegment = Float32Array.of(2)
    const segmentResult = createDeferred<ReturnType<typeof successResult<Float32Array>>>()
    const events: Array<string> = []
    let onSpeechEnd: () => void = () => undefined
    const recording: SpeechRecording = {
      cancel: vi.fn(),
      onSpeechEnd: (handler) => {
        onSpeechEnd = handler
        return vi.fn()
      },
      stop: vi.fn(async () => {
        events.push('stop')
        return successResult(finalSegment)
      }),
      takeSegment: vi.fn(() => segmentResult.promise),
    }
    const endpoint = createEndpointTranscription({
      isDisposed: () => false,
      onCaptureFailure: vi.fn(),
      onUnexpectedError: vi.fn(),
      transcribeAudio: vi.fn(async (audio) => {
        events.push(`transcribe-${audio[0]}`)
      }),
    })

    endpoint.start(recording)
    onSpeechEnd()
    const stop = endpoint.stop(recording)
    expect(recording.stop).not.toHaveBeenCalled()

    segmentResult.resolve(successResult(segment))
    await expect(stop).resolves.toEqual({ok: true, value: finalSegment})
    expect(events).toEqual(['transcribe-1', 'stop', 'transcribe-2'])
  })

  it('should cancel capture when rotating a segment fails', async () => {
    let onSpeechEnd: () => void = () => undefined
    const onCaptureFailure = vi.fn()
    const recording: SpeechRecording = {
      cancel: vi.fn(),
      onSpeechEnd: (handler) => {
        onSpeechEnd = handler
        return vi.fn()
      },
      stop: vi.fn(async () => successResult(Float32Array.of(1))),
      takeSegment: vi.fn(async () =>
        failureResult({code: 'capture-failed' as const, retryable: true}),
      ),
    }
    const endpoint = createEndpointTranscription({
      isDisposed: () => false,
      onCaptureFailure,
      onUnexpectedError: vi.fn(),
      transcribeAudio: vi.fn(async () => undefined),
    })

    endpoint.start(recording)
    onSpeechEnd()
    await vi.waitFor(() => expect(recording.cancel).toHaveBeenCalledTimes(1))
    expect(onCaptureFailure).toHaveBeenCalledWith({code: 'capture-failed', retryable: true})
    await expect(endpoint.stop(recording)).resolves.toEqual({
      error: {code: 'capture-cancelled', retryable: true},
      ok: false,
    })
  })

  it('should ignore another speech boundary while a segment capture is pending', async () => {
    const segment = createDeferred<ReturnType<typeof successResult<Float32Array>>>()
    let onSpeechEnd: () => void = () => undefined
    const recording: SpeechRecording = {
      cancel: vi.fn(),
      onSpeechEnd: (handler) => {
        onSpeechEnd = handler
        return vi.fn()
      },
      stop: vi.fn(async () => successResult(Float32Array.of(2))),
      takeSegment: vi.fn(() => segment.promise),
    }
    const transcribeAudio = vi.fn(async () => undefined)
    const endpoint = createEndpointTranscription({
      isDisposed: () => false,
      onCaptureFailure: vi.fn(),
      onUnexpectedError: vi.fn(),
      transcribeAudio,
    })

    endpoint.start(recording)
    onSpeechEnd()
    onSpeechEnd()

    expect(recording.takeSegment).toHaveBeenCalledOnce()
    segment.resolve(successResult(Float32Array.of(1)))
    await vi.waitFor(() => expect(transcribeAudio).toHaveBeenCalledOnce())
  })

  it('should cancel stop when disposed while waiting for a segment', async () => {
    const segment = createDeferred<ReturnType<typeof successResult<Float32Array>>>()
    let onSpeechEnd: () => void = () => undefined
    const unsubscribe = vi.fn()
    const recording: SpeechRecording = {
      cancel: vi.fn(),
      onSpeechEnd: (handler) => {
        onSpeechEnd = handler
        return unsubscribe
      },
      stop: vi.fn(async () => successResult(Float32Array.of(2))),
      takeSegment: vi.fn(() => segment.promise),
    }
    const endpoint = createEndpointTranscription({
      isDisposed: () => false,
      onCaptureFailure: vi.fn(),
      onUnexpectedError: vi.fn(),
      transcribeAudio: vi.fn(async () => undefined),
    })

    endpoint.start(recording)
    onSpeechEnd()
    const stop = endpoint.stop(recording)
    endpoint.dispose()
    segment.resolve(successResult(Float32Array.of(1)))

    await expect(stop).resolves.toEqual({
      error: {code: 'capture-cancelled', retryable: true},
      ok: false,
    })
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(recording.stop).not.toHaveBeenCalled()
  })

  it('should report a segment exception and return a final capture failure', async () => {
    const segmentError = new Error('segment failed')
    const finalFailure = failureResult({code: 'capture-failed' as const, retryable: true})
    let onSpeechEnd: () => void = () => undefined
    const recording: SpeechRecording = {
      cancel: vi.fn(),
      onSpeechEnd: (handler) => {
        onSpeechEnd = handler
        return vi.fn()
      },
      stop: vi.fn(async () => finalFailure),
      takeSegment: vi.fn(async () => {
        throw segmentError
      }),
    }
    const onUnexpectedError = vi.fn()
    const transcribeAudio = vi.fn(async () => undefined)
    const endpoint = createEndpointTranscription({
      isDisposed: () => false,
      onCaptureFailure: vi.fn(),
      onUnexpectedError,
      transcribeAudio,
    })

    endpoint.start(recording)
    onSpeechEnd()

    await expect(endpoint.stop(recording)).resolves.toEqual(finalFailure)
    expect(onUnexpectedError).toHaveBeenCalledWith(segmentError)
    expect(transcribeAudio).not.toHaveBeenCalled()
  })

  it('should report a transcription exception and still return captured audio', async () => {
    const audio = Float32Array.of(1)
    const transcriptionError = new Error('transcription failed')
    const recording: SpeechRecording = {
      cancel: vi.fn(),
      onSpeechEnd: vi.fn(() => vi.fn()),
      stop: vi.fn(async () => successResult(audio)),
      takeSegment: vi.fn(async () => successResult(Float32Array.of(2))),
    }
    const onUnexpectedError = vi.fn()
    const endpoint = createEndpointTranscription({
      isDisposed: () => false,
      onCaptureFailure: vi.fn(),
      onUnexpectedError,
      transcribeAudio: vi.fn(async () => {
        throw transcriptionError
      }),
    })

    endpoint.start(recording)

    await expect(endpoint.stop(recording)).resolves.toEqual({ok: true, value: audio})
    expect(onUnexpectedError).toHaveBeenCalledWith(transcriptionError)
  })
})
