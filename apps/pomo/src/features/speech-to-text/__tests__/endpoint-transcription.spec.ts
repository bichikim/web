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
})
