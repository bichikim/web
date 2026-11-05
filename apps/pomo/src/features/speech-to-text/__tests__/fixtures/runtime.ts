import {noop} from 'es-toolkit'
import {createRoot} from 'solid-js'
import {vi} from 'vitest'
import {successResult} from 'src/features/result'
import {
  type SpeechBackend,
  type SpeechRecognizer,
  type SpeechRecorder,
  type SpeechRecording,
  type SpeechToTextRuntime,
  useSpeechToText,
  type UseSpeechToTextProps,
} from '../..'
import type {SpeechTestRoot} from './types'

const SAMPLE_COUNT = 4_000
const SAMPLE_VALUE = 0.1

export const createRecording = (): SpeechRecording => ({
  cancel: vi.fn(),
  onSpeechEnd: vi.fn(() => () => undefined),
  stop: vi.fn(async () => successResult(new Float32Array(SAMPLE_COUNT).fill(SAMPLE_VALUE))),
  takeSegment: vi.fn(async () => successResult(new Float32Array(SAMPLE_COUNT).fill(SAMPLE_VALUE))),
})

export const createRecognizer = (): SpeechRecognizer => ({
  dispose: vi.fn(),
  prepare: vi.fn(async () => successResult({backend: 'wasm' as const})),
  transcribe: vi.fn(async () => successResult({backend: 'wasm' as const, text: '테스트 문장'})),
})

export const createRuntime = (
  recorder: SpeechRecorder,
  recognizer: SpeechRecognizer,
): SpeechToTextRuntime => ({
  createRecognizer: vi.fn(() => recognizer),
  createRecorder: vi.fn(() => recorder),
  getPreferredBackend: vi.fn((): SpeechBackend => 'wasm'),
})

export const createSpeechRoot = (
  runtime: SpeechToTextRuntime,
  props: Omit<UseSpeechToTextProps, 'runtime'> = {},
): SpeechTestRoot => {
  let disposeRoot: () => void = noop
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useSpeechToText({...props, runtime})
  })
  return {controller, dispose: disposeRoot}
}
