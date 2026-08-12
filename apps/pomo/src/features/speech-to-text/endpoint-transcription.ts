import type {SpeechCaptureError} from './errors'
import type {SpeechRecording} from './recorder'
import {speechFailure, type SpeechResult} from './result'

const createCancelledResult = (): SpeechResult<Float32Array, SpeechCaptureError> =>
  speechFailure({code: 'capture-cancelled', retryable: true})

interface CreateEndpointTranscriptionOptions {
  readonly isDisposed: () => boolean
  readonly onCaptureFailure: (error: SpeechCaptureError) => void
  readonly onUnexpectedError: (error: unknown) => void
  readonly transcribeAudio: (audio: Float32Array) => Promise<void>
}

export interface EndpointTranscription {
  readonly dispose: () => void
  readonly start: (recording: SpeechRecording) => void
  readonly stop: (
    recording: SpeechRecording,
  ) => Promise<SpeechResult<Float32Array, SpeechCaptureError>>
}

/** Rotates recordings at detected speech boundaries while preserving one microphone stream. */
export const createEndpointTranscription = (
  options: CreateEndpointTranscriptionOptions,
): EndpointTranscription => {
  let activeRecording: SpeechRecording | null = null
  let segmentCapture: Promise<void> | null = null
  let transcriptionTask = Promise.resolve()
  let unsubscribe: (() => void) | null = null

  const enqueueTranscription = (audio: Float32Array) => {
    transcriptionTask = transcriptionTask
      .then(() => options.transcribeAudio(audio))
      .catch(options.onUnexpectedError)
  }

  const captureSegment = (recording: SpeechRecording) => {
    if (activeRecording !== recording || segmentCapture !== null) {
      return
    }

    segmentCapture = recording
      .takeSegment()
      .then((result) => {
        if (options.isDisposed() || activeRecording !== recording) {
          return
        }

        if (!result.ok) {
          unsubscribe?.()
          unsubscribe = null
          recording.cancel()
          activeRecording = null
          options.onCaptureFailure(result.error)
          return
        }

        enqueueTranscription(result.value)
      })
      .catch(options.onUnexpectedError)
      .finally(() => {
        segmentCapture = null
      })
  }

  const start = (recording: SpeechRecording) => {
    activeRecording = recording
    transcriptionTask = Promise.resolve()
    unsubscribe = recording.onSpeechEnd(() => captureSegment(recording))
  }

  const stop = async (recording: SpeechRecording) => {
    if (activeRecording !== recording) {
      return createCancelledResult()
    }

    unsubscribe?.()
    unsubscribe = null
    await segmentCapture

    if (activeRecording !== recording) {
      return createCancelledResult()
    }

    activeRecording = null
    const audioResult = await recording.stop()

    if (audioResult.ok) {
      enqueueTranscription(audioResult.value)
      await transcriptionTask
    }

    return audioResult
  }

  const dispose = () => {
    unsubscribe?.()
    unsubscribe = null
    activeRecording = null
  }

  return {dispose, start, stop}
}
