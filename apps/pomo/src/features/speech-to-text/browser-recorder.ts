import {decodeSpeechRecording, type SpeechAudioDecoder} from './audio'
import type {SpeechCaptureError} from './errors'
import type {SpeechRecorder, SpeechRecording} from './recorder'
import {failureResult, type Result, successResult} from '../result'
import {createBrowserSpeechEndDetector, type SpeechEndDetector} from './speech-end-detector'

export interface CreateBrowserSpeechRecorderOptions {
  readonly decodeRecording?: SpeechAudioDecoder
  readonly createSpeechEndDetector?: (stream: MediaStream) => SpeechEndDetector | null
}

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

interface RecordingSegment {
  readonly cancel: (onStopped: () => void) => void
  readonly stop: (onStopped: () => void) => Promise<Result<Float32Array, SpeechCaptureError>>
}

interface CreateRecordingSegmentOptions {
  readonly decodeRecording: SpeechAudioDecoder
  readonly stream: MediaStream
}

const getBusyResult = (): Promise<Result<Float32Array, SpeechCaptureError>> =>
  Promise.resolve(failureResult({code: 'capture-busy', retryable: true}))

const createRecordingSegment = (options: CreateRecordingSegmentOptions): RecordingSegment => {
  const recorder = new MediaRecorder(options.stream)
  const chunks: Array<Blob> = []
  let cancelled = false
  let resolveStop!: (result: Result<Float32Array, SpeechCaptureError>) => void
  const stopResult = new Promise<Result<Float32Array, SpeechCaptureError>>((resolve) => {
    resolveStop = resolve
  })

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  })
  recorder.start()

  const finish = (onStopped: () => void) => {
    recorder.addEventListener(
      'stop',
      () => {
        onStopped()

        if (cancelled) {
          resolveStop(failureResult({code: 'capture-cancelled', retryable: true}))
          return
        }

        const recording = new Blob(chunks, {type: recorder.mimeType})
        options
          .decodeRecording(recording)
          .then((audio) => resolveStop(successResult(audio)))
          .catch((error: unknown) => resolveStop(failureResult(createCaptureError(error))))
      },
      {once: true},
    )
    recorder.stop()
  }

  return {
    cancel: (onStopped) => {
      cancelled = true
      finish(onStopped)
    },
    stop: (onStopped) => {
      finish(onStopped)
      return stopResult
    },
  }
}

/** Creates a recorder that owns at most one microphone stream at a time. */
export const createBrowserSpeechRecorder = (
  options: CreateBrowserSpeechRecorderOptions = {},
): SpeechRecorder => {
  const decodeRecording = options.decodeRecording ?? decodeSpeechRecording
  let activeSession: symbol | null = null

  const start = async (): Promise<Result<SpeechRecording, SpeechCaptureError>> => {
    if (!isRecordingSupported()) {
      return failureResult({code: 'unsupported', retryable: false})
    }

    if (activeSession !== null) {
      return failureResult({code: 'capture-busy', retryable: true})
    }

    const session = Symbol('speech-recording')
    activeSession = session
    let stream: MediaStream | null = null

    try {
      const acquiredStream = await navigator.mediaDevices.getUserMedia({audio: true})
      stream = acquiredStream
      let closed = false
      let currentSegment: RecordingSegment | null = createRecordingSegment({
        decodeRecording,
        stream: acquiredStream,
      })
      let speechEndDetector: SpeechEndDetector | null = null
      let speechEndDetectorInitialized = false
      let segmentOperation: Promise<Result<Float32Array, SpeechCaptureError>> | null = null
      let released = false
      const release = () => {
        if (!released) {
          released = true
          speechEndDetector?.dispose()
          acquiredStream.getTracks().forEach((track) => track.stop())
        }

        if (activeSession === session) {
          activeSession = null
        }
      }

      return successResult({
        cancel: () => {
          if (!closed) {
            closed = true
            currentSegment?.cancel(release)
            currentSegment = null
          }

          if (segmentOperation !== null) {
            release()
          }
        },
        onSpeechEnd: (handler) => {
          if (!speechEndDetectorInitialized) {
            speechEndDetectorInitialized = true

            try {
              speechEndDetector = (
                options.createSpeechEndDetector ?? createBrowserSpeechEndDetector
              )(acquiredStream)
            } catch {
              speechEndDetector = null
            }
          }

          return speechEndDetector?.subscribe(handler) ?? (() => undefined)
        },
        stop: () => {
          const segment = currentSegment

          if (closed || segment === null || segmentOperation !== null) {
            return getBusyResult()
          }

          closed = true
          currentSegment = null
          return segment.stop(release)
        },
        takeSegment: () => {
          const segment = currentSegment

          if (closed || segment === null || segmentOperation !== null) {
            return getBusyResult()
          }

          currentSegment = null
          let rotationError: SpeechCaptureError | null = null
          segmentOperation = segment
            .stop(() => {
              if (closed) {
                release()
                return
              }

              try {
                currentSegment = createRecordingSegment({
                  decodeRecording,
                  stream: acquiredStream,
                })
              } catch (error) {
                rotationError = createCaptureError(error)
                closed = true
                release()
              }
            })
            .then((result) => {
              if (rotationError !== null) {
                return failureResult(rotationError)
              }

              return closed ? failureResult({code: 'capture-cancelled', retryable: true}) : result
            })
            .finally(() => {
              segmentOperation = null
            })
          return segmentOperation
        },
      })
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop())
      activeSession = null
      return failureResult(createCaptureError(error))
    }
  }

  return {isSupported: isRecordingSupported, start}
}
