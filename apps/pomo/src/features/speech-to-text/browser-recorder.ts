import {decodeSpeechRecording, type SpeechAudioDecoder} from './audio'
import type {SpeechCaptureError} from './errors'
import type {SpeechRecorder, SpeechRecording} from './recorder'
import {speechFailure, type SpeechResult, speechSuccess} from './result'

export interface CreateBrowserSpeechRecorderOptions {
  readonly decodeRecording?: SpeechAudioDecoder
}

const ignoreStopResult = (_result: SpeechResult<Float32Array, SpeechCaptureError>) => undefined

const createCaptureError = (error: unknown): SpeechCaptureError => {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return {code: 'permission-denied', retryable: true}
  }

  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return {code: 'device-not-found', retryable: true}
  }

  return {
    code: 'capture-failed',
    detail: error instanceof Error ? error.message : undefined,
    retryable: true,
  }
}

const isRecordingSupported = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined'

/** Creates a recorder that owns at most one microphone stream at a time. */
export const createBrowserSpeechRecorder = (
  options: CreateBrowserSpeechRecorderOptions = {},
): SpeechRecorder => {
  const decodeRecording = options.decodeRecording ?? decodeSpeechRecording
  let active = false

  const start = async (): Promise<SpeechResult<SpeechRecording, SpeechCaptureError>> => {
    if (!isRecordingSupported()) {
      return speechFailure({code: 'unsupported', retryable: false})
    }

    if (active) {
      return speechFailure({code: 'capture-busy', retryable: true})
    }

    active = true
    let stream: MediaStream | null = null

    try {
      const acquiredStream = await navigator.mediaDevices.getUserMedia({audio: true})
      stream = acquiredStream
      const recorder = new MediaRecorder(acquiredStream)
      const chunks: Array<Blob> = []
      let cancelled = false
      let resolveStop: (result: SpeechResult<Float32Array, SpeechCaptureError>) => void =
        ignoreStopResult
      const stopResult = new Promise<SpeechResult<Float32Array, SpeechCaptureError>>((resolve) => {
        resolveStop = resolve
      })
      const release = () => {
        acquiredStream.getTracks().forEach((track) => track.stop())
        active = false
      }

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      })
      recorder.addEventListener(
        'stop',
        () => {
          release()

          if (cancelled) {
            resolveStop(speechFailure({code: 'capture-cancelled', retryable: true}))
            return
          }

          const recording = new Blob(chunks, {type: recorder.mimeType})
          decodeRecording(recording)
            .then((audio) => resolveStop(speechSuccess(audio)))
            .catch((error: unknown) => resolveStop(speechFailure(createCaptureError(error))))
        },
        {once: true},
      )
      recorder.start()

      return speechSuccess({
        cancel: () => {
          cancelled = true

          if (recorder.state === 'recording') {
            recorder.stop()
          } else {
            release()
            resolveStop(speechFailure({code: 'capture-cancelled', retryable: true}))
          }
        },
        stop: () => {
          if (recorder.state === 'recording') {
            recorder.stop()
          }

          return stopResult
        },
      })
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop())
      active = false
      return speechFailure(createCaptureError(error))
    }
  }

  return {isSupported: isRecordingSupported, start}
}
