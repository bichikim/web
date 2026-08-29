/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  parseSupertonicVoiceStyle,
  type SupertonicVoiceId,
  type SupertonicVoiceLabController,
  useSupertonicVoiceLab,
} from '../../features/supertonic'
import {VoiceGenerator} from '../VoiceGenerator'
import {VoiceActions} from '../voice-generator/Actions'
import {AudioChunks} from '../voice-generator/AudioChunks'
import {AudioResults} from '../voice-generator/AudioResults'
import {VoiceFields} from '../voice-generator/Fields'
import {VoiceHeader} from '../voice-generator/Header'
import {ModelPicker} from '../voice-generator/ModelPicker'

vi.mock('../../features/supertonic', () => ({
  parseSupertonicVoiceStyle: vi.fn(),
  SUPERTONIC_VOICES: [
    {id: 'Yuna', label: 'Yuna'},
    {id: 'F1', label: 'Sarah'},
  ],
  useSupertonicVoiceLab: vi.fn(),
}))
vi.mock('../voice-generator/Actions', () => ({VoiceActions: vi.fn()}))
vi.mock('../voice-generator/AudioChunks', () => ({AudioChunks: vi.fn()}))
vi.mock('../voice-generator/AudioResults', () => ({AudioResults: vi.fn()}))
vi.mock('../voice-generator/Fields', () => ({VoiceFields: vi.fn()}))
vi.mock('../voice-generator/Header', () => ({VoiceHeader: vi.fn()}))
vi.mock('../voice-generator/ModelPicker', () => ({ModelPicker: vi.fn()}))

interface VoiceLabHarness {
  readonly controller: SupertonicVoiceLabController
  readonly setBusy: (value: boolean) => void
  readonly setError: (value: string | null) => void
  readonly setModelId: (value: 'full' | 'int8') => void
  readonly setReady: (value: boolean) => void
  readonly setTextValue: (value: string) => void
}

let selectedFile: File | undefined

const createFile = ({
  name,
  size = 100,
  text = '{}',
}: {
  readonly name: string
  readonly size?: number
  readonly text?: string | Promise<string>
}) =>
  ({
    name,
    size,
    text: vi.fn().mockImplementation(() => Promise.resolve(text)),
  }) as unknown as File

const createHarness = (): VoiceLabHarness => {
  const [isBusy, setBusy] = createSignal(false)
  const [errorMessage, setError] = createSignal<string | null>(null)
  const [isModelReady, setReady] = createSignal(false)
  const [selectedModelId, setModelId] = createSignal<'full' | 'int8'>('full')
  const [selectedVoiceId, setVoiceId] = createSignal<SupertonicVoiceId>('Yuna')
  const [text, setTextValue] = createSignal('초기 대사')
  const controller: SupertonicVoiceLabController = {
    canGenerate: () => true,
    canPrepare: () => true,
    chunks: () => [],
    errorMessage,
    generate: vi.fn().mockResolvedValue(undefined),
    isBusy,
    isModelReady,
    prepare: vi.fn().mockResolvedValue(undefined),
    progress: () => 37,
    results: () => [],
    selectCustomVoice: vi.fn(),
    selectedModel: () => ({id: selectedModelId()}) as never,
    selectedModelId,
    selectedVoiceId,
    selectModel: vi.fn(setModelId),
    selectVoice: vi.fn(setVoiceId),
    setText: vi.fn(setTextValue),
    state: () => ({message: '상태', status: isBusy() ? 'generating' : 'unprepared'}),
    statusMessage: () => '상태',
    text,
  }

  return {
    controller,
    setBusy,
    setError,
    setModelId,
    setReady,
    setTextValue,
  }
}

const renderGenerator = (harness: VoiceLabHarness) => {
  vi.mocked(useSupertonicVoiceLab).mockReturnValue(harness.controller)
  return render(() => <VoiceGenerator />)
}

const getFileError = () => screen.getByTestId('voice-fields').getAttribute('data-file-error')
const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.clearAllMocks()
  selectedFile = undefined
  vi.mocked(parseSupertonicVoiceStyle).mockReturnValue({ok: true, value: {style: true}} as never)
  vi.mocked(VoiceHeader).mockImplementation(() => <h1>Voice Lab</h1>)
  vi.mocked(ModelPicker).mockImplementation((props: Parameters<typeof ModelPicker>[0]) => (
    <div
      data-disabled={String(props.disabled)}
      data-model={props.selectedModelId}
      data-testid="model-picker"
    >
      <button onClick={() => props.onModelChange('int8')} type="button">
        INT8 선택
      </button>
    </div>
  ))
  vi.mocked(VoiceFields).mockImplementation((props: Parameters<typeof VoiceFields>[0]) => (
    <div
      data-disabled={String(props.disabled)}
      data-file-error={props.fileError ?? ''}
      data-imported={props.importedVoice?.name ?? ''}
      data-testid="voice-fields"
      data-text={props.text}
      data-voice={props.selectedVoiceId}
    >
      <button
        onClick={() =>
          props.onTextInput({currentTarget: {value: '직접 입력'}} as InputEvent & {
            currentTarget: HTMLTextAreaElement
          })
        }
        type="button"
      >
        대사 입력
      </button>
      <button onClick={() => props.onSampleSelect('샘플 대사')} type="button">
        샘플 선택
      </button>
      <button
        onClick={() =>
          props.onVoiceChange({currentTarget: {value: 'F1'}} as Event & {
            currentTarget: HTMLSelectElement
          })
        }
        type="button"
      >
        기본 목소리
      </button>
      <button
        onClick={() =>
          props.onVoiceChange({currentTarget: {value: 'missing'}} as Event & {
            currentTarget: HTMLSelectElement
          })
        }
        type="button"
      >
        잘못된 목소리
      </button>
      <button onClick={() => props.onFileSelect(selectedFile)} type="button">
        파일 선택
      </button>
    </div>
  ))
  vi.mocked(AudioChunks).mockImplementation((props: Parameters<typeof AudioChunks>[0]) => (
    <div data-count={props.chunks.length} data-testid="audio-chunks" />
  ))
  vi.mocked(AudioResults).mockImplementation((props: Parameters<typeof AudioResults>[0]) => (
    <div data-count={props.results.length} data-testid="audio-results" />
  ))
  vi.mocked(VoiceActions).mockImplementation((props: Parameters<typeof VoiceActions>[0]) => (
    <div
      data-can-generate={String(props.canGenerate)}
      data-can-prepare={String(props.canPrepare)}
      data-error={props.errorMessage ?? ''}
      data-progress={props.progress}
      data-ready={String(props.isModelReady)}
      data-status={props.status}
      data-testid="voice-actions"
    >
      <button onClick={props.onGenerate} type="button">
        생성
      </button>
      <button onClick={props.onPrepare} type="button">
        준비
      </button>
    </div>
  ))
})

describe('VoiceGenerator', () => {
  it('should connect the voice lab state and basic field actions', async () => {
    const harness = createHarness()
    renderGenerator(harness)

    expect(useSupertonicVoiceLab).toHaveBeenCalledWith({
      initialText: '오늘도 서두르지 말고, 한 번에 하나씩 집중해 볼까요?',
    })
    expect(screen.getByRole('heading', {name: 'Voice Lab'})).toBeInTheDocument()
    expect(screen.getByTestId('model-picker')).toHaveAttribute('data-model', 'full')
    expect(screen.getByTestId('voice-fields')).toHaveAttribute('data-voice', 'Yuna')
    expect(screen.getByTestId('audio-chunks')).toHaveAttribute('data-count', '0')
    expect(screen.getByTestId('audio-results')).toHaveAttribute('data-count', '0')
    expect(screen.getByTestId('voice-actions')).toMatchObject({})

    fireEvent.click(screen.getByRole('button', {name: 'INT8 선택'}))
    fireEvent.click(screen.getByRole('button', {name: '대사 입력'}))
    fireEvent.click(screen.getByRole('button', {name: '샘플 선택'}))
    expect(harness.controller.selectModel).toHaveBeenCalledWith('int8')
    expect(harness.controller.setText).toHaveBeenNthCalledWith(1, '직접 입력')
    expect(harness.controller.setText).toHaveBeenNthCalledWith(2, '샘플 대사')

    harness.setBusy(true)
    harness.setReady(true)
    harness.setError('실패')
    await waitFor(() => {
      expect(screen.getByTestId('model-picker')).toHaveAttribute('data-disabled', 'true')
      expect(screen.getByTestId('voice-actions')).toHaveAttribute('data-error', '실패')
      expect(screen.getByTestId('voice-actions')).toHaveAttribute('data-ready', 'true')
    })
    fireEvent.click(screen.getByRole('button', {name: '생성'}))
    fireEvent.click(screen.getByRole('button', {name: '준비'}))
    expect(harness.controller.generate).toHaveBeenCalledOnce()
    expect(harness.controller.prepare).toHaveBeenCalledOnce()
  })

  it('should switch to a built-in voice and ignore unknown voice ids', () => {
    const harness = createHarness()
    renderGenerator(harness)

    fireEvent.click(screen.getByRole('button', {name: '잘못된 목소리'}))
    expect(harness.controller.selectVoice).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', {name: '기본 목소리'}))

    expect(harness.controller.selectVoice).toHaveBeenCalledWith('F1')
    expect(screen.getByTestId('voice-fields')).toHaveAttribute('data-imported', '')
    expect(getFileError()).toBe('')
  })

  it('should validate missing, extension, and size failures', async () => {
    const harness = createHarness()
    renderGenerator(harness)

    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    expect(getFileError()).toBe('')

    selectedFile = createFile({name: 'voice.txt'})
    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    await waitFor(() =>
      expect(getFileError()).toBe('Supertonic 3 목소리 스타일 JSON 파일을 선택해 주세요.'),
    )

    selectedFile = createFile({name: 'voice.json', size: 2_000_001})
    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    await waitFor(() => expect(getFileError()).toBe('목소리 JSON은 2MB보다 작아야 해요.'))
    expect(selectedFile.text).not.toHaveBeenCalled()
  })

  it('should import valid JSON and report invalid style or unreadable JSON', async () => {
    const harness = createHarness()
    renderGenerator(harness)

    selectedFile = createFile({name: 'VOICE.JSON', text: '{"voice":true}'})
    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    await waitFor(() => expect(harness.controller.selectCustomVoice).toHaveBeenCalledOnce())
    expect(parseSupertonicVoiceStyle).toHaveBeenCalledWith({voice: true})
    expect(screen.getByTestId('voice-fields')).toHaveAttribute('data-imported', 'VOICE.JSON')

    vi.mocked(parseSupertonicVoiceStyle).mockReturnValueOnce({ok: false} as never)
    selectedFile = createFile({name: 'invalid.json'})
    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    await waitFor(() =>
      expect(getFileError()).toBe('Supertonic 3 목소리 스타일 형식과 맞지 않는 JSON이에요.'),
    )

    selectedFile = createFile({name: 'broken.json', text: '{'})
    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    await waitFor(() =>
      expect(getFileError()).toBe(
        'JSON 파일을 읽지 못했어요. 파일이 손상되지 않았는지 확인해 주세요.',
      ),
    )

    fireEvent.click(screen.getByRole('button', {name: '기본 목소리'}))
    expect(screen.getByTestId('voice-fields')).toHaveAttribute('data-imported', '')
    expect(getFileError()).toBe('')
  })

  it('should ignore a stale successful file read', async () => {
    let resolveText: ((value: string) => void) | undefined
    const text = new Promise<string>((resolve) => {
      resolveText = resolve
    })
    const harness = createHarness()
    renderGenerator(harness)
    selectedFile = createFile({name: 'delayed.json', text})

    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    fireEvent.click(screen.getByRole('button', {name: '기본 목소리'}))
    resolveText?.('{}')
    await flushPromises()

    expect(parseSupertonicVoiceStyle).not.toHaveBeenCalled()
    expect(harness.controller.selectCustomVoice).not.toHaveBeenCalled()
  })

  it('should ignore a stale failed file read', async () => {
    let rejectText: ((error: Error) => void) | undefined
    const text = new Promise<string>((_resolve, reject) => {
      rejectText = reject
    })
    const harness = createHarness()
    renderGenerator(harness)
    selectedFile = createFile({name: 'delayed.json', text})

    fireEvent.click(screen.getByRole('button', {name: '파일 선택'}))
    fireEvent.click(screen.getByRole('button', {name: '기본 목소리'}))
    rejectText?.(new Error('read failed'))
    await flushPromises()

    expect(getFileError()).toBe('')
  })
})
