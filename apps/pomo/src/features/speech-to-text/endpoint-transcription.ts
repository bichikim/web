import type {SpeechCaptureError} from './errors'
import type {SpeechRecording} from './recorder'
import {failureResult, type Result} from 'src/features/result'
import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'

const createCancelledResult = (): Result<Float32Array, SpeechCaptureError> =>
  failureResult({code: 'capture-cancelled', retryable: true})

interface CreateEndpointTranscriptionOptions {
  readonly isDisposed: () => boolean
  readonly onCaptureFailure: (error: SpeechCaptureError) => void
  readonly onUnexpectedError: (error: unknown) => void
  readonly transcribeAudio: (audio: Float32Array) => Promise<void>
}

export interface EndpointTranscription {
  readonly dispose: () => void
  readonly start: (recording: SpeechRecording) => void
  readonly stop: (recording: SpeechRecording) => Promise<Result<Float32Array, SpeechCaptureError>>
}

/** Rotates recordings at detected speech boundaries while preserving one microphone stream. */
export const createEndpointTranscription = (
  options: CreateEndpointTranscriptionOptions,
): EndpointTranscription => {
  let activeRecording: SpeechRecording | null = null
  let segmentCapture: Promise<void> | null = null
  let transcriptionTasks = createSerialTaskQueue()
  let unsubscribe: (() => void) | null = null

  const enqueueTranscription = (audio: Float32Array) => {
    transcriptionTasks.run(async () => {
      try {
        await options.transcribeAudio(audio)
      } catch (error: unknown) {
        options.onUnexpectedError(error)
      }
    })
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
    transcriptionTasks = createSerialTaskQueue()
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
      await transcriptionTasks.settle()
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
