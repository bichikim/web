import {
  type Accessor,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Setter,
  untrack,
} from 'solid-js'

import {createBrowserSpeechRecorder} from './browser-recorder'
import {createSpeechRecognizer} from './client'
import {createEndpointTranscription, type EndpointTranscription} from './endpoint-transcription'
import {getSpeechErrorMessage, type SpeechCaptureError} from './errors'
import type {SpeechRecorder, SpeechRecording} from './recorder'
import {DEFAULT_SPEECH_MODEL_ID, type SpeechModelId} from './models'
import type {CreateSpeechRecognizerOptions, SpeechBackend, SpeechRecognizer} from './recognizer'
import {
  createSpeechModelOwner,
  type SpeechModelOwner,
  type SpeechModelState,
} from './speech-model-owner'
import {appendSpeechTranscript} from './transcript'

const MAXIMUM_PROGRESS = 100
const MILLISECONDS_PER_SECOND = 1000
const MINIMUM_SAMPLE_COUNT = 4_000
const RECORDING_INTERVAL = 250
const TRANSCRIPTION_LANGUAGE = 'korean'

export type SpeechActivity = 'checking' | 'idle' | 'processing' | 'recording' | 'requesting'

export interface SpeechToTextRuntime {
  readonly createRecognizer: (options: CreateSpeechRecognizerOptions) => SpeechRecognizer
  readonly createRecorder: () => SpeechRecorder
  readonly getPreferredBackend: () => SpeechBackend
}

export interface UseSpeechToTextProps {
  readonly accumulateText?: boolean
  readonly endpointing?: Accessor<boolean>
  readonly modelId?: SpeechModelId
  readonly onTranscript?: (text: string) => void
  readonly runtime?: SpeechToTextRuntime
}

export interface SpeechToTextController {
  readonly activity: Accessor<SpeechActivity>
  readonly backend: Accessor<SpeechBackend | null>
  readonly elapsedTime: Accessor<number>
  readonly errorMessage: Accessor<string | null>
  readonly isSupported: Accessor<boolean | null>
  readonly modelProgress: Accessor<number>
  readonly modelState: Accessor<SpeechModelState>
  readonly setText: Setter<string>
  readonly startRecording: () => Promise<void>
  readonly stopRecording: () => Promise<void>
  readonly text: Accessor<string>
  readonly toggleRecording: () => void
}

const getPreferredBackend = (): SpeechBackend =>
  typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm'

const DEFAULT_RUNTIME: SpeechToTextRuntime = {
  createRecognizer: createSpeechRecognizer,
  createRecorder: createBrowserSpeechRecorder,
  getPreferredBackend,
}

const getModelProgress = (state: SpeechModelState) => {
  switch (state.status) {
    case 'idle':
      return 0
    case 'loading':
      return state.progress
    case 'ready':
      return MAXIMUM_PROGRESS
  }

  state satisfies never
}

const createRecordingTimer = (setElapsedTime: Setter<number>) => {
  let intervalId: number | null = null
  let startedAt = 0

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
  }

  const start = () => {
    stop()
    startedAt = performance.now()
    setElapsedTime(0)
    intervalId = window.setInterval(() => {
      setElapsedTime((performance.now() - startedAt) / MILLISECONDS_PER_SECOND)
    }, RECORDING_INTERVAL)
  }

  return {start, stop}
}

interface RecorderReference {
  current: SpeechRecorder | null
}

interface RecordingReference {
  current: SpeechRecording | null
}

interface CreateRecordingActionsOptions {
  readonly activity: Accessor<SpeechActivity>
  readonly endpointing: Accessor<boolean>
  readonly endpointTranscription: EndpointTranscription
  readonly isDisposed: () => boolean
  readonly modelOwner: SpeechModelOwner
  readonly onCaptureFailure: (error: SpeechCaptureError) => void
  readonly recorder: RecorderReference
  readonly recording: RecordingReference
  readonly setActivity: Setter<SpeechActivity>
  readonly setErrorMessage: Setter<string | null>
  readonly setModelState: Setter<SpeechModelState>
  readonly timer: ReturnType<typeof createRecordingTimer>
  readonly transcribeAudio: (audio: Float32Array) => Promise<void>
}

const createRecordingActions = (options: CreateRecordingActionsOptions) => {
  let endpointingActive = false

  const startRecording = async () => {
    if (options.activity() !== 'idle' || options.recorder.current === null) {
      return
    }

    options.setActivity('requesting')
    options.setErrorMessage(null)

    const result = await options.recorder.current.start()

    if (options.isDisposed()) {
      if (result.ok) {
        result.value.cancel()
      }
      return
    }

    if (!result.ok) {
      options.onCaptureFailure(result.error)
      return
    }

    options.recording.current = result.value
    endpointingActive = options.endpointing()

    if (endpointingActive) {
      options.endpointTranscription.start(result.value)
    }

    options.setActivity('recording')
    options.timer.start()

    options.modelOwner.prepare().catch((error: unknown) => {
      if (!options.isDisposed()) {
        options.setModelState({status: 'idle'})
        options.setErrorMessage(error instanceof Error ? error.message : '음성 인식 모델 준비 오류')
      }
    })
  }

  const stopRecording = async () => {
    const activeRecording = options.recording.current

    if (options.activity() !== 'recording' || activeRecording === null) {
      return
    }

    options.timer.stop()
    options.setActivity('processing')
    options.setErrorMessage(null)
    const shouldTranscribeEndpoints = endpointingActive
    endpointingActive = false
    const audioResult = shouldTranscribeEndpoints
      ? await options.endpointTranscription.stop(activeRecording)
      : await activeRecording.stop()

    if (options.isDisposed() || options.recording.current !== activeRecording) {
      return
    }

    options.recording.current = null

    if (!audioResult.ok) {
      options.onCaptureFailure(audioResult.error)
      return
    }

    if (!shouldTranscribeEndpoints && audioResult.value.length < MINIMUM_SAMPLE_COUNT) {
      options.onCaptureFailure({code: 'capture-too-short', retryable: true})
      return
    }

    if (!shouldTranscribeEndpoints) {
      await options.transcribeAudio(audioResult.value)
    }

    if (!options.isDisposed()) {
      options.setActivity('idle')
    }
  }

  const toggleRecording = () => {
    const currentActivity = options.activity()

    if (currentActivity === 'recording') {
      stopRecording().catch((error: unknown) => {
        if (!options.isDisposed()) {
          options.setErrorMessage(error instanceof Error ? error.message : '음성 처리 오류')
          options.setActivity('idle')
        }
      })
      return
    }

    if (currentActivity === 'idle') {
      startRecording().catch((error: unknown) => {
        if (!options.isDisposed()) {
          options.setErrorMessage(error instanceof Error ? error.message : '마이크 실행 오류')
          options.setActivity('idle')
        }
      })
    }
  }

  return {startRecording, stopRecording, toggleRecording}
}

export const useSpeechToText = (props: UseSpeechToTextProps = {}): SpeechToTextController => {
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const accumulateText = untrack(() => props.accumulateText ?? true)
  const modelId = untrack(() => props.modelId ?? DEFAULT_SPEECH_MODEL_ID)
  const endpointing = untrack(() => props.endpointing ?? (() => false))
  const [activity, setActivity] = createSignal<SpeechActivity>('checking')
  const [backend, setBackend] = createSignal<SpeechBackend | null>(null)
  const [elapsedTime, setElapsedTime] = createSignal(0)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isSupported, setIsSupported] = createSignal<boolean | null>(null)
  const [modelState, setModelState] = createSignal<SpeechModelState>({status: 'idle'})
  const [text, setText] = createSignal('')
  const modelProgress = createMemo(() => getModelProgress(modelState()))

  let disposed = false
  const recorder: RecorderReference = {current: null}
  const recording: RecordingReference = {current: null}
  const timer = createRecordingTimer(setElapsedTime)
  const modelOwner = createSpeechModelOwner({
    createRecognizer: runtime.createRecognizer,
    isDisposed: () => disposed,
    language: TRANSCRIPTION_LANGUAGE,
    modelId,
    onBackendChange: setBackend,
    onError: (error) => setErrorMessage(getSpeechErrorMessage(error)),
    onStateChange: setModelState,
    preferredBackend: runtime.getPreferredBackend(),
  })

  const handleCaptureFailure = (error: SpeechCaptureError) => {
    timer.stop()
    setErrorMessage(getSpeechErrorMessage(error))
    setActivity('idle')
  }

  const transcribeAudio = async (audio: Float32Array) => {
    if (audio.length < MINIMUM_SAMPLE_COUNT) {
      return
    }

    const transcriptionResult = await modelOwner.transcribe(audio)

    if (disposed || !transcriptionResult.ok) {
      return
    }

    const transcript = transcriptionResult.value.text.trim()

    if (transcript.length > 0) {
      if (accumulateText) {
        setText((current) => appendSpeechTranscript(current, transcript))
      }
      props.onTranscript?.(transcript)
    }
  }

  const endpointTranscription = createEndpointTranscription({
    isDisposed: () => disposed,
    onCaptureFailure: (error) => {
      recording.current = null
      handleCaptureFailure(error)
    },
    onUnexpectedError: (error) => {
      if (!disposed) {
        setErrorMessage(error instanceof Error ? error.message : '음성 처리 오류')
      }
    },
    transcribeAudio,
  })

  const recordingActions = createRecordingActions({
    activity,
    endpointing,
    endpointTranscription,
    isDisposed: () => disposed,
    modelOwner,
    onCaptureFailure: handleCaptureFailure,
    recorder,
    recording,
    setActivity,
    setErrorMessage,
    setModelState,
    timer,
    transcribeAudio,
  })

  onMount(() => {
    recorder.current = runtime.createRecorder()
    const supported = recorder.current.isSupported()
    setIsSupported(supported)
    setBackend(runtime.getPreferredBackend())
    setActivity('idle')

    if (!supported) {
      setErrorMessage(getSpeechErrorMessage({code: 'unsupported', retryable: false}))
    }
  })

  onCleanup(() => {
    disposed = true
    timer.stop()
    recording.current?.cancel()
    recording.current = null
    endpointTranscription.dispose()
    modelOwner.dispose()
  })

  return {
    activity,
    backend,
    elapsedTime,
    errorMessage,
    isSupported,
    modelProgress,
    modelState,
    setText,
    startRecording: recordingActions.startRecording,
    stopRecording: recordingActions.stopRecording,
    text,
    toggleRecording: recordingActions.toggleRecording,
  }
}
