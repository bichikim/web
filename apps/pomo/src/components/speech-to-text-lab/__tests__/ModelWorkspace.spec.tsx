/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {
  type SpeechActivity,
  type SpeechModelDefinition,
  type SpeechModelState,
  type SpeechToTextController,
  useSpeechToText,
} from '../../../features/speech-to-text/index'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {SpeechModelWorkspace} from '../ModelWorkspace'

vi.mock('../../../features/speech-to-text/index', () => ({useSpeechToText: vi.fn()}))

const MODEL: SpeechModelDefinition = {
  description: '한국어 음성을 빠르게 받아써요.',
  family: 'moonshine',
  id: 'moonshine-tiny-ko',
  label: 'Moonshine Tiny KO',
  repositoryId: 'onnx-community/moonshine-tiny-ko-ONNX',
  sizeLabel: '27M 파라미터',
  speedLabel: '가장 빠름',
}

const createController = () => {
  const [activity, setActivity] = createSignal<SpeechActivity>('idle')
  const [backend, setBackend] = createSignal<'wasm' | 'webgpu' | null>('wasm')
  const [elapsedTime, setElapsedTime] = createSignal(0)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isSupported, setIsSupported] = createSignal<boolean | null>(true)
  const [modelProgress, setModelProgress] = createSignal(100)
  const [modelState, setModelState] = createSignal<SpeechModelState>({
    backend: 'wasm',
    status: 'ready',
  })
  const [text, setText] = createSignal('')
  const toggleRecording = vi.fn()
  const controller = {
    activity,
    backend,
    elapsedTime,
    errorMessage,
    isSupported,
    modelProgress,
    modelState,
    setText,
    startRecording: vi.fn(async () => undefined),
    stopRecording: vi.fn(async () => undefined),
    text,
    toggleRecording,
  } satisfies SpeechToTextController

  vi.mocked(useSpeechToText).mockReturnValue(controller)

  return {
    setActivity,
    setBackend,
    setElapsedTime,
    setErrorMessage,
    setIsSupported,
    setModelProgress,
    setModelState,
    toggleRecording,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SpeechModelWorkspace', () => {
  it('should render the selected model and forward transcript changes', () => {
    const speech = createController()
    render(() => <SpeechModelWorkspace model={MODEL} />)

    expect(useSpeechToText).toHaveBeenCalledWith({modelId: MODEL.id})
    expect(screen.getByText(`선택됨 · ${MODEL.label}`)).toBeInTheDocument()
    expect(screen.getByText('WASM')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()

    const transcript = screen.getByRole('textbox', {name: '받아쓰기 결과'})
    fireEvent.input(transcript, {target: {value: '새로운 받아쓰기 결과'}})
    expect(transcript).toHaveValue('새로운 받아쓰기 결과')

    const microphone = screen.getByRole('button', {name: '마이크로 받아쓰기'})
    expect(microphone).toHaveAttribute('aria-pressed', 'false')
    expect(microphone).toBeEnabled()
    fireEvent.click(microphone)
    expect(speech.toggleRecording).toHaveBeenCalledOnce()
  })

  it('should reflect recording, processing, and microphone permission states', () => {
    const speech = createController()
    render(() => <SpeechModelWorkspace model={MODEL} />)

    speech.setElapsedTime(12.34)
    speech.setActivity('recording')
    const recordingButton = screen.getByRole('button', {name: '녹음 멈추고 받아쓰기'})
    expect(screen.getByText('녹음 중 · 12.3초')).toBeInTheDocument()
    expect(recordingButton).toHaveAttribute('aria-pressed', 'true')
    expect(recordingButton.className).toContain('bg-#ff8e9e')
    expect(recordingButton).toBeEnabled()

    speech.setActivity('processing')
    const processingButton = screen.getByRole('button', {name: '마이크 또는 음성을 처리하는 중'})
    expect(screen.getByText('받아쓰는 중…')).toBeInTheDocument()
    expect(processingButton).toBeDisabled()

    speech.setActivity('checking')
    expect(screen.getByText('받아쓰는 중…')).toBeInTheDocument()

    speech.setActivity('requesting')
    expect(screen.getByText('마이크 권한 확인 중…')).toBeInTheDocument()
  })

  it('should show model download progress, backend fallback, and recognition errors', () => {
    const speech = createController()
    render(() => <SpeechModelWorkspace model={MODEL} />)

    speech.setBackend('webgpu')
    speech.setModelProgress(42)
    speech.setModelState({progress: 42, status: 'loading'})
    const progress = screen.getByRole('progressbar', {name: `${MODEL.label} 42% 준비됨`})
    expect(screen.getByText(`${MODEL.label} 준비 중 · 42%`)).toBeInTheDocument()
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '42')
    expect(progress.firstElementChild).toHaveStyle({width: '42%'})
    expect(screen.getByText('WebGPU')).toBeInTheDocument()

    speech.setIsSupported(null)
    expect(screen.getByRole('button', {name: '마이크로 받아쓰기'})).toBeDisabled()
    speech.setErrorMessage('마이크를 사용할 수 없어요.')
    expect(screen.getByRole('alert')).toHaveTextContent('마이크를 사용할 수 없어요.')
  })
})
