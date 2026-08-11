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
import {getSpeechErrorMessage, type SpeechCaptureError} from './errors'
import type {SpeechRecorder, SpeechRecording} from './recorder'
import type {CreateSpeechRecognizerOptions, SpeechBackend, SpeechRecognizer} from './recognizer'
import {createSpeechModelOwner, type SpeechModelState} from './speech-model-owner'

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

const appendTranscript = (current: string, next: string) => {
  const trimmedText = next.trim()

  if (trimmedText.length === 0) {
    return current
  }

  return current.trim().length === 0 ? trimmedText : `${current.trimEnd()} ${trimmedText}`
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

export const useSpeechToText = (props: UseSpeechToTextProps = {}): SpeechToTextController => {
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [activity, setActivity] = createSignal<SpeechActivity>('checking')
  const [backend, setBackend] = createSignal<SpeechBackend | null>(null)
  const [elapsedTime, setElapsedTime] = createSignal(0)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isSupported, setIsSupported] = createSignal<boolean | null>(null)
  const [modelState, setModelState] = createSignal<SpeechModelState>({status: 'idle'})
  const [text, setText] = createSignal('')
  const modelProgress = createMemo(() => getModelProgress(modelState()))

  let disposed = false
  let recorder: SpeechRecorder | null = null
  let recording: SpeechRecording | null = null
  const timer = createRecordingTimer(setElapsedTime)
  const modelOwner = createSpeechModelOwner({
    createRecognizer: runtime.createRecognizer,
    isDisposed: () => disposed,
    language: TRANSCRIPTION_LANGUAGE,
    onBackendChange: setBackend,
    onError: (error) => setErrorMessage(getSpeechErrorMessage(error)),
    onStateChange: setModelState,
    preferredBackend: runtime.getPreferredBackend(),
  })

  const handleCaptureFailure = (error: SpeechCaptureError) => {
    setErrorMessage(getSpeechErrorMessage(error))
    setActivity('idle')
  }

  const startRecording = async () => {
    if (activity() !== 'idle' || recorder === null) {
      return
    }

    setActivity('requesting')
    setErrorMessage(null)
    const result = await recorder.start()

    if (disposed) {
      if (result.ok) {
        result.value.cancel()
      }
      return
    }

    if (!result.ok) {
      handleCaptureFailure(result.error)
      return
    }

    recording = result.value
    setActivity('recording')
    timer.start()
    modelOwner.prepare().catch((error: unknown) => {
      if (!disposed) {
        setModelState({status: 'idle'})
        setErrorMessage(error instanceof Error ? error.message : '음성 인식 모델 준비 오류')
      }
    })
  }

  const stopRecording = async () => {
    const activeRecording = recording

    if (activity() !== 'recording' || activeRecording === null) {
      return
    }

    recording = null
    timer.stop()
    setActivity('processing')
    setErrorMessage(null)
    const audioResult = await activeRecording.stop()

    if (disposed) {
      return
    }

    if (!audioResult.ok) {
      handleCaptureFailure(audioResult.error)
      return
    }

    if (audioResult.value.length < MINIMUM_SAMPLE_COUNT) {
      handleCaptureFailure({code: 'capture-too-short', retryable: true})
      return
    }

    const transcriptionResult = await modelOwner.transcribe(audioResult.value)

    if (disposed) {
      return
    }

    if (transcriptionResult.ok) {
      setText((current) => appendTranscript(current, transcriptionResult.value.text))
    }

    setActivity('idle')
  }

  const toggleRecording = () => {
    const currentActivity = activity()

    if (currentActivity === 'recording') {
      stopRecording().catch((error: unknown) => {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : '음성 처리 오류')
          setActivity('idle')
        }
      })
      return
    }

    if (currentActivity === 'idle') {
      startRecording().catch((error: unknown) => {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : '마이크 실행 오류')
          setActivity('idle')
        }
      })
    }
  }

  onMount(() => {
    recorder = runtime.createRecorder()
    const supported = recorder.isSupported()
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
    recording?.cancel()
    recording = null
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
    startRecording,
    stopRecording,
    text,
    toggleRecording,
  }
}
