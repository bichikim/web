import {decodeSpeechRecording, type SpeechAudioDecoder} from './audio'
import type {SpeechCaptureError} from './errors'
import type {SpeechRecorder, SpeechRecording} from './recorder'
import {failureResult, type Result, successResult} from 'src/features/result'
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

const createInterruptedCaptureError = (): SpeechCaptureError => ({
  code: 'capture-failed',
  detail: '마이크 녹음이 중단됐어요. 다시 시도해 주세요.',
  retryable: true,
})

const isRecordingSupported = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined'

interface RecordingSegment {
  readonly cancel: (onStopped: () => void) => void
  readonly stop: (
    onStopped: () => void,
    shouldStopRecorder?: boolean,
  ) => Promise<Result<Float32Array, SpeechCaptureError>>
}

const RECORDING_TIMESLICE = 250

interface CreateRecordingSegmentOptions {
  readonly onDataAvailable: () => void
  readonly decodeRecording: SpeechAudioDecoder
  readonly onInterruption: () => void
  readonly stream: MediaStream
}

const getBusyResult = (): Promise<Result<Float32Array, SpeechCaptureError>> =>
  Promise.resolve(failureResult({code: 'capture-busy', retryable: true}))

const getSegmentRotationResult = (
  result: Result<Float32Array, SpeechCaptureError>,
  closed: boolean,
  interruptionError: SpeechCaptureError | null,
  rotationError: SpeechCaptureError | null,
): Result<Float32Array, SpeechCaptureError> => {
  if (rotationError !== null) {
    return failureResult(rotationError)
  }

  if (closed && interruptionError === null) {
    return failureResult({code: 'capture-cancelled', retryable: true})
  }

  return result
}

const createRecordingSegment = (options: CreateRecordingSegmentOptions): RecordingSegment => {
  const recorder = new MediaRecorder(options.stream)
  const chunks: Array<Blob> = []
  let cancelled = false
  let stopObserved = false
  let stopRequested = false
  let stopContinuation: (() => void) | null = null
  let stopContinuationCalled = false
  const {promise: stopResult, resolve: resolveStop} =
    Promise.withResolvers<Result<Float32Array, SpeechCaptureError>>()

  const notifyStopped = () => {
    if (stopContinuation === null || stopContinuationCalled) {
      return
    }

    stopContinuationCalled = true
    stopContinuation()
  }

  recorder.addEventListener('dataavailable', (event) => {
    options.onDataAvailable()
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  })
  recorder.addEventListener('error', options.onInterruption)
  recorder.addEventListener('stop', () => {
    if (stopObserved) {
      return
    }

    stopObserved = true

    if (!stopRequested) {
      options.onInterruption()
    }

    notifyStopped()

    if (cancelled) {
      resolveStop(failureResult({code: 'capture-cancelled', retryable: true}))
      return
    }

    const recording = new Blob(chunks, {type: recorder.mimeType})
    options
      .decodeRecording(recording)
      .then((audio) => resolveStop(successResult(audio)))
      .catch((error: unknown) => resolveStop(failureResult(createCaptureError(error))))
  })
  recorder.start(RECORDING_TIMESLICE)

  const finish = (onStopped: () => void, shouldStopRecorder: boolean) => {
    stopContinuation = onStopped

    if (stopObserved) {
      notifyStopped()
      return
    }

    if (shouldStopRecorder && recorder.state !== 'inactive') {
      stopRequested = true
      recorder.stop()
    }
  }

  return {
    cancel: (onStopped) => {
      cancelled = true
      finish(onStopped, true)
    },
    stop: (onStopped, shouldStopRecorder = true) => {
      finish(onStopped, shouldStopRecorder)
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

  const start = async (
    onDataAvailable?: () => void,
    onInterruption?: (error: SpeechCaptureError) => void,
  ): Promise<Result<SpeechRecording, SpeechCaptureError>> => {
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
      const tracks = acquiredStream.getTracks()

      if (tracks.length === 0 || tracks.some((track) => track.readyState === 'ended')) {
        tracks.forEach((track) => track.stop())
        activeSession = null
        return failureResult(createInterruptedCaptureError())
      }

      let closed = false
      let interruptionError: SpeechCaptureError | null = null
      let stopRecorderAfterInterruption = false
      const notifyInterruption = (stopRecorder: boolean) => {
        if (closed) {
          return
        }

        closed = true
        interruptionError = createInterruptedCaptureError()
        stopRecorderAfterInterruption = stopRecorder
        onInterruption?.(interruptionError)
      }
      const onTrackEnded = () =>
        notifyInterruption(tracks.some((track) => track.readyState !== 'ended'))
      const onSegmentInterruption = () => notifyInterruption(false)
      const notifyData = () => !closed && onDataAvailable?.()
      let currentSegment: RecordingSegment | null = createRecordingSegment({
        decodeRecording,
        onDataAvailable: notifyData,
        onInterruption: onSegmentInterruption,
        stream: acquiredStream,
      })
      tracks.forEach((track) => track.addEventListener('ended', onTrackEnded))
      let speechEndDetector: SpeechEndDetector | null | undefined
      let segmentOperation: Promise<Result<Float32Array, SpeechCaptureError>> | null = null
      const release = () => {
        if (activeSession === session) {
          activeSession = null
          speechEndDetector?.dispose()
          tracks.forEach((track) => {
            track.removeEventListener('ended', onTrackEnded)
            track.stop()
          })
        }
      }

      return successResult({
        cancel: () => {
          if (!closed || interruptionError !== null) {
            closed = true
            currentSegment?.cancel(release)
            currentSegment = null
          }

          if (segmentOperation !== null || interruptionError !== null) {
            release()
          }
        },
        onSpeechEnd: (handler) => {
          if (closed) {
            return () => undefined
          }

          if (speechEndDetector === undefined) {
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

          if (closed && interruptionError === null) {
            return getBusyResult()
          }

          if (segment === null && interruptionError !== null && segmentOperation === null) {
            release()
            return Promise.resolve(successResult(new Float32Array()))
          }

          if (segment === null || segmentOperation !== null) {
            return getBusyResult()
          }

          closed = true
          currentSegment = null
          return segment.stop(release, interruptionError === null || stopRecorderAfterInterruption)
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
                return release()
              }
              if (tracks.some((track) => track.readyState === 'ended')) {
                onTrackEnded()
                return release()
              }

              try {
                currentSegment = createRecordingSegment({
                  decodeRecording,
                  onDataAvailable: notifyData,
                  onInterruption: onSegmentInterruption,
                  stream: acquiredStream,
                })
              } catch (error) {
                rotationError = createCaptureError(error)
                closed = true
                release()
              }
            })
            .then((result) =>
              getSegmentRotationResult(result, closed, interruptionError, rotationError),
            )
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
