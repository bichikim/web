/** @vitest-environment jsdom */

import {A, useNavigate} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, type JSX, Show} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {usePSceneStyle} from '../../../features/focus-room-animation'
import {
  type DialogueEditorState,
  type PDialogueEditorController,
  usePDialogueEditor,
  usePEvents,
} from '../../../features/focus-room-dialogue'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  type ModelDownloadState,
  useModelDownload,
} from '../../../features/model-download'
import {formatModelDownloadSize} from '../../../features/model-storage'
import {getSupertonicModel, isSupertonicModelDownloaded} from '../../../features/supertonic'
import {getPrimaryMood} from '../../../features/text-mood'
import {PFaceIcon} from '../../PFaceIcon'
import {PGenerationStatus} from '../../PGenerationStatus'
import {PModelDownloadConsent} from '../../PModelDownloadConsent'
import PDialogueDraftGenerator from '../DraftGenerator'
import PDialogueEditor from '../Editor'

vi.mock('@solidjs/router', () => ({A: vi.fn(), useNavigate: vi.fn()}))
vi.mock('../../../features/focus-room-animation', () => ({usePSceneStyle: vi.fn()}))
vi.mock('../../../features/focus-room-dialogue', () => ({
  usePDialogueEditor: vi.fn(),
  usePEvents: vi.fn(),
}))
vi.mock('../../../features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../../../features/model-storage', () => ({formatModelDownloadSize: vi.fn()}))
vi.mock('../../../features/supertonic', async () => {
  const actual: typeof import('../../../features/supertonic') = await vi.importActual(
    '../../../features/supertonic',
  )

  return {
    ...actual,
    getSupertonicModel: vi.fn(),
    isSupertonicModelDownloaded: vi.fn(),
  }
})
vi.mock('../../../features/text-mood', () => ({getPrimaryMood: vi.fn()}))
vi.mock('../DraftGenerator', () => ({default: vi.fn()}))
vi.mock('../../PFaceIcon', () => ({PFaceIcon: vi.fn()}))
vi.mock('../../PGenerationStatus', () => ({PGenerationStatus: vi.fn()}))
vi.mock('../../PModelDownloadConsent', () => ({PModelDownloadConsent: vi.fn()}))

interface DraftGeneratorProps {
  readonly disabled?: boolean
  readonly onBusyChange?: (busy: boolean) => void
  readonly onGenerated?: (text: string) => void
}

interface GenerationStatusProps {
  readonly message: string
  readonly onCancel?: () => void
  readonly progress?: number | null
}

interface DownloadConsentProps {
  readonly downloadSize: string
  readonly isOpen: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

interface EditorHarness {
  readonly controller: PDialogueEditorController
  readonly setAudioUrl: (value: string | null) => void
  readonly setCanGenerate: (value: boolean) => void
  readonly setCanRegenerate: (value: boolean) => void
  readonly setCanSave: (value: boolean) => void
  readonly setDuration: (value: number) => void
  readonly setProgress: (value: number) => void
  readonly setRegeneratingIndex: (value: number | null) => void
  readonly setSegments: PDialogueEditorController['segments'] extends () => infer Value
    ? (value: Value) => void
    : never
  readonly setState: (value: DialogueEditorState) => void
  readonly setTextValue: (value: string) => void
}

const navigate = vi.fn()
const refreshDialogues = vi.fn().mockResolvedValue(undefined)

const createModelDownload = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  startVoiceModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  state: () => ({status: 'idle'}),
})

const createEditorHarness = (): EditorHarness => {
  const [audioUrl, setAudioUrl] = createSignal<string | null>(null)
  const [canGenerate, setCanGenerate] = createSignal(true)
  const [canRegenerateSegments, setCanRegenerate] = createSignal(false)
  const [canSave, setCanSave] = createSignal(false)
  const [durationMs, setDuration] = createSignal(0)
  const [language, setLanguage] = createSignal<'ko' | 'en'>('ko')
  const [modelId, setModelId] = createSignal<'full' | 'int8'>('full')
  const [progress, setProgress] = createSignal(0)
  const [regeneratingSegmentIndex, setRegeneratingIndex] = createSignal<number | null>(null)
  const [segments, setSegments] = createSignal<ReturnType<PDialogueEditorController['segments']>>(
    [],
  )
  const [state, setState] = createSignal<DialogueEditorState>({
    message: '준비됨',
    status: 'idle',
  })
  const [text, setTextValue] = createSignal('오늘도 잘할 수 있어요.')
  const [voiceId, setVoiceId] = createSignal<'Yuna' | 'F1'>('Yuna')
  const controller: PDialogueEditorController = {
    audioUrl,
    canGenerate,
    canRegenerateSegments,
    canSave,
    dialogueId: () => null,
    durationMs,
    generate: vi.fn().mockResolvedValue(undefined),
    language,
    modelId,
    progress,
    regenerateSegment: vi.fn().mockResolvedValue(undefined),
    regeneratingSegmentIndex,
    save: vi.fn().mockResolvedValue(null),
    segments,
    setLanguage,
    setModelId,
    setText: vi.fn(setTextValue),
    setVoiceId,
    state,
    text,
    voiceId,
  }

  return {
    controller,
    setAudioUrl,
    setCanGenerate,
    setCanRegenerate,
    setCanSave,
    setDuration,
    setProgress,
    setRegeneratingIndex,
    setSegments,
    setState,
    setTextValue,
  }
}

const renderEditor = (harness: EditorHarness, dialogueId: string | null = null) => {
  vi.mocked(usePDialogueEditor).mockImplementation((props) => {
    props.dialogueId()
    return harness.controller
  })
  return render(() => <PDialogueEditor dialogueId={dialogueId} />)
}

const getVoiceSelect = () => screen.getByRole('combobox', {name: '목소리'})
const getLanguageSelect = () => screen.getByRole('combobox', {name: '언어'})
const getModelSelect = () => screen.getByRole('combobox', {name: '모델'})
const getGenerateButton = () => screen.getByRole('button', {name: '음성 만들기'})
const getSaveButton = () => screen.getByRole('button', {name: '대화 저장'})

beforeEach(() => {
  vi.clearAllMocks()
  refreshDialogues.mockResolvedValue(undefined)
  vi.mocked(A).mockImplementation(
    (props) =>
      (
        <a data-class={props.class} href={props.href}>
          {props.children}
        </a>
      ) as never,
  )
  vi.mocked(useNavigate).mockReturnValue(navigate)
  vi.mocked(usePEvents).mockReturnValue({refreshDialogues} as never)
  vi.mocked(usePSceneStyle).mockReturnValue({sceneStyle: () => 'scribble'} as never)
  vi.mocked(useModelDownload).mockReturnValue(createModelDownload())
  vi.mocked(formatModelDownloadSize).mockReturnValue('123 MB')
  vi.mocked(getSupertonicModel).mockReturnValue({size: 123} as never)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(getPrimaryMood).mockImplementation((id) => ({id, label: '기쁨'}) as never)
  vi.mocked(PDialogueDraftGenerator).mockImplementation((props: DraftGeneratorProps) => (
    <div data-disabled={String(props.disabled)} data-testid="draft-generator">
      <button onClick={() => props.onBusyChange?.(true)} type="button">
        초안 시작
      </button>
      <button onClick={() => props.onBusyChange?.(false)} type="button">
        초안 종료
      </button>
      <button onClick={() => props.onGenerated?.('생성된 대사')} type="button">
        초안 적용
      </button>
    </div>
  ))
  vi.mocked(PGenerationStatus).mockImplementation((props: GenerationStatusProps) => (
    <output data-progress={props.progress ?? 'none'} data-testid="generation-status">
      {props.message}
      <Show when={props.onCancel}>
        {(onCancel) => (
          <button onClick={onCancel()} type="button">
            취소
          </button>
        )}
      </Show>
    </output>
  ))
  vi.mocked(PModelDownloadConsent).mockImplementation((props: DownloadConsentProps) => (
    <div data-download-size={props.downloadSize} data-testid="download-consent">
      <Show when={props.isOpen}>
        <button onClick={props.onCancel} type="button">
          다운로드 취소
        </button>
        <button onClick={props.onConfirm} type="button">
          다운로드 확인
        </button>
      </Show>
    </div>
  ))
  vi.mocked(PFaceIcon).mockImplementation(
    (props: {readonly mood: string; readonly sceneStyle?: string}) => (
      <span data-mood={props.mood} data-scene-style={props.sceneStyle} data-testid="face-icon" />
    ),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PDialogueEditor fields', () => {
  it('should render a new dialogue and update text, voice, language, model, and draft state', async () => {
    const harness = createEditorHarness()
    const result = renderEditor(harness)

    expect(screen.getByRole('heading', {name: '새 대화 만들기'})).toBeInTheDocument()
    expect(result.container.querySelector('main')).toHaveClass(
      '[background:var(--pomo-editor-background)]',
      'text-foreground',
    )
    expect(screen.getByRole('region', {name: '대사 입력'})).toHaveClass(
      'border-border',
      'bg-modal-surface',
    )
    expect(screen.getByRole('textbox', {name: /대사/}).closest('label')).toHaveClass(
      '[&_textarea]:bg-surface-strong',
      '[&_textarea]:text-foreground',
    )
    expect(screen.getByRole('link', {name: '앱으로 돌아가기'})).toHaveAttribute('href', '/')
    expect(screen.getByText('음성을 만들면 구간별 텍스트와 시작 시간이 표시돼요.')).toBeVisible()
    expect(screen.getByText('13 / 3000')).toBeInTheDocument()
    expect(screen.getByTestId('download-consent')).toHaveAttribute('data-download-size', '123 MB')

    fireEvent.input(screen.getByRole('textbox', {name: /대사/}), {
      target: {value: '직접 입력'},
    })
    expect(harness.controller.setText).toHaveBeenCalledWith('직접 입력')

    fireEvent.change(getVoiceSelect(), {target: {value: 'F1'}})
    fireEvent.change(getLanguageSelect(), {target: {value: 'en'}})
    fireEvent.change(getModelSelect(), {target: {value: 'int8'}})
    expect(harness.controller.voiceId()).toBe('F1')
    expect(harness.controller.language()).toBe('en')
    expect(harness.controller.modelId()).toBe('int8')

    fireEvent.change(getVoiceSelect(), {target: {value: 'missing'}})
    fireEvent.change(getLanguageSelect(), {target: {value: 'missing'}})
    fireEvent.change(getModelSelect(), {target: {value: 'missing'}})
    expect(harness.controller.voiceId()).toBe('F1')
    expect(harness.controller.language()).toBe('en')
    expect(harness.controller.modelId()).toBe('int8')

    fireEvent.click(screen.getByRole('button', {name: '초안 적용'}))
    expect(harness.controller.setText).toHaveBeenCalledWith('생성된 대사')
    fireEvent.click(screen.getByRole('button', {name: '초안 시작'}))
    expect(screen.getByRole('textbox', {name: /대사/})).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {name: '초안 종료'}))
    await waitFor(() => expect(screen.getByRole('textbox', {name: /대사/})).toBeEnabled())
  })

  it('should render the edit heading for an existing dialogue', () => {
    renderEditor(createEditorHarness(), 'dialogue-1')

    expect(screen.getByRole('heading', {name: '대화 편집하기'})).toBeInTheDocument()
  })
})

describe('PDialogueEditor audio generation', () => {
  it('should expose every busy state and preparing progress', async () => {
    const harness = createEditorHarness()
    renderEditor(harness)

    for (const status of ['generating', 'analyzing', 'loading', 'saving'] as const) {
      harness.setState({message: status, status})
      expect(getGenerateButton()).toBeDisabled()
    }

    harness.setProgress(42)
    harness.setState({message: 'preparing', progress: 42, status: 'preparing'})
    await waitFor(() =>
      expect(screen.getByTestId('generation-status')).toHaveAttribute('data-progress', '42'),
    )
    harness.setState({message: 'idle', status: 'idle'})
    await waitFor(() =>
      expect(screen.getByTestId('generation-status')).toHaveAttribute('data-progress', 'none'),
    )
  })

  it('should return when generation is busy or unavailable', async () => {
    const harness = createEditorHarness()
    renderEditor(harness)
    const button = getGenerateButton() as HTMLButtonElement

    harness.setState({message: 'loading', status: 'loading'})
    await waitFor(() => expect(button).toBeDisabled())
    button.disabled = false
    fireEvent.click(button)
    expect(isSupertonicModelDownloaded).not.toHaveBeenCalled()

    harness.setState({message: 'idle', status: 'idle'})
    harness.setCanGenerate(false)
    await waitFor(() => expect(button).toBeDisabled())
    button.disabled = false
    fireEvent.click(button)
    expect(isSupertonicModelDownloaded).not.toHaveBeenCalled()
  })

  it('should generate with a downloaded model and request consent otherwise', async () => {
    const harness = createEditorHarness()
    const modelDownload = createModelDownload()
    vi.mocked(useModelDownload).mockReturnValue(modelDownload)
    vi.mocked(isSupertonicModelDownloaded)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
    renderEditor(harness)

    fireEvent.click(getGenerateButton())
    await waitFor(() => expect(harness.controller.generate).toHaveBeenCalledOnce())
    expect(isSupertonicModelDownloaded).toHaveBeenCalledWith({modelId: 'full'})

    fireEvent.click(getGenerateButton())
    await waitFor(() => expect(screen.getByRole('button', {name: '다운로드 취소'})).toBeVisible())
    fireEvent.click(screen.getByRole('button', {name: '다운로드 취소'}))
    expect(screen.queryByRole('button', {name: '다운로드 취소'})).not.toBeInTheDocument()

    fireEvent.click(getGenerateButton())
    await waitFor(() => expect(screen.getByRole('button', {name: '다운로드 확인'})).toBeVisible())
    fireEvent.click(screen.getByRole('button', {name: '다운로드 확인'}))
    await waitFor(() => expect(harness.controller.generate).toHaveBeenCalledTimes(2))
    expect(modelDownload.startVoiceModel).toHaveBeenCalledWith('full')
  })

  it('should stop after disposal during the model availability check', async () => {
    let resolveDownloaded: ((downloaded: boolean) => void) | undefined
    vi.mocked(isSupertonicModelDownloaded).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDownloaded = resolve
        }),
    )
    const harness = createEditorHarness()
    const view = renderEditor(harness)

    fireEvent.click(getGenerateButton())
    view.unmount()
    resolveDownloaded?.(true)
    await Promise.resolve()

    expect(harness.controller.generate).not.toHaveBeenCalled()
  })

  it('should show matching audio download progress while ignoring unrelated targets', () => {
    const [downloadState, setDownloadState] = createSignal<ModelDownloadState>({
      label: '다른 음성 모델',
      percentage: 42,
      status: 'loading',
      target: {kind: 'voice', modelId: 'int8'},
    })
    const modelDownload = createModelDownload()
    vi.mocked(useModelDownload).mockReturnValue({...modelDownload, state: downloadState})
    const harness = createEditorHarness()
    renderEditor(harness)

    expect(screen.getByTestId('generation-status')).toHaveTextContent('준비됨')
    expect(screen.getByTestId('generation-status')).toHaveAttribute('data-progress', 'none')
    expect(screen.queryByRole('button', {name: '취소'})).toBeNull()

    setDownloadState({
      label: '텍스트 모델',
      percentage: 42,
      status: 'loading',
      target: {kind: 'text', modelId: 'gemma-4-e2b'},
    })
    expect(screen.getByTestId('generation-status')).toHaveTextContent('준비됨')
    expect(screen.queryByRole('button', {name: '취소'})).toBeNull()

    setDownloadState({
      label: '선택한 음성 모델',
      percentage: 42,
      status: 'loading',
      target: {kind: 'voice', modelId: 'full'},
    })
    expect(screen.getByTestId('generation-status')).toHaveTextContent(
      '음성 모델 파일을 백그라운드에서 내려받고 있어요.',
    )
    expect(screen.getByTestId('generation-status')).toHaveAttribute('data-progress', '42')
  })

  it('should cancel the selected audio model download and re-enable the controls', async () => {
    const [downloadState, setDownloadState] = createSignal<ModelDownloadState>({
      label: '선택한 음성 모델',
      percentage: 42,
      status: 'loading',
      target: {kind: 'voice', modelId: 'full'},
    })
    const modelDownload = createModelDownload()
    vi.mocked(modelDownload.cancel).mockImplementation(() => setDownloadState({status: 'idle'}))
    vi.mocked(useModelDownload).mockReturnValue({...modelDownload, state: downloadState})
    const harness = createEditorHarness()
    renderEditor(harness)

    expect(getVoiceSelect()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {name: '취소'}))

    expect(modelDownload.cancel).toHaveBeenCalledOnce()
    await waitFor(() => expect(getVoiceSelect()).toBeEnabled())
    expect(getGenerateButton()).toBeEnabled()
  })

  it('should report audio download errors and ignore a download completing after disposal', async () => {
    const modelDownload = createModelDownload()
    vi.mocked(modelDownload.startVoiceModel).mockResolvedValue({
      message: '음성 모델을 내려받지 못했어요.',
      status: 'error',
    })
    vi.mocked(useModelDownload).mockReturnValue(modelDownload)
    vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
    const errorHarness = createEditorHarness()
    const errorView = renderEditor(errorHarness)

    fireEvent.click(getGenerateButton())
    await waitFor(() => expect(screen.getByRole('button', {name: '다운로드 확인'})).toBeVisible())
    fireEvent.click(screen.getByRole('button', {name: '다운로드 확인'}))
    await waitFor(() =>
      expect(screen.getByTestId('generation-status')).toHaveTextContent(
        '음성 모델을 내려받지 못했어요.',
      ),
    )
    errorView.unmount()

    vi.mocked(modelDownload.startVoiceModel).mockResolvedValueOnce({status: 'cancelled'})
    const cancelledHarness = createEditorHarness()
    const cancelledView = renderEditor(cancelledHarness)
    fireEvent.click(getGenerateButton())
    await waitFor(() => expect(screen.getByRole('button', {name: '다운로드 확인'})).toBeVisible())
    fireEvent.click(screen.getByRole('button', {name: '다운로드 확인'}))
    await waitFor(() => expect(screen.getByTestId('generation-status')).toHaveTextContent('준비됨'))
    cancelledView.unmount()

    let resolveDownload: ((result: ModelDownloadResult) => void) | undefined
    vi.mocked(modelDownload.startVoiceModel).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDownload = resolve
        }),
    )
    const disposedHarness = createEditorHarness()
    const disposedView = renderEditor(disposedHarness)

    fireEvent.click(getGenerateButton())
    await waitFor(() => expect(screen.getByRole('button', {name: '다운로드 확인'})).toBeVisible())
    fireEvent.click(screen.getByRole('button', {name: '다운로드 확인'}))
    disposedView.unmount()
    resolveDownload?.({status: 'complete'})
    await Promise.resolve()

    expect(disposedHarness.controller.generate).not.toHaveBeenCalled()
  })
})

describe('PDialogueEditor saving and timeline', () => {
  it('should save, refresh, and navigate while tolerating refresh failures', async () => {
    const harness = createEditorHarness()
    harness.setCanSave(true)
    vi.mocked(harness.controller.save)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('saved-1')
      .mockResolvedValueOnce('saved-2')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderEditor(harness)

    fireEvent.click(getSaveButton())
    await waitFor(() => expect(harness.controller.save).toHaveBeenCalledTimes(1))
    expect(navigate).not.toHaveBeenCalled()

    fireEvent.click(getSaveButton())
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
    expect(refreshDialogues).toHaveBeenCalledOnce()

    refreshDialogues.mockRejectedValueOnce(new Error('refresh failed'))
    fireEvent.click(getSaveButton())
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(2))
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to refresh saved focus room dialogues.',
      expect.any(Error),
    )
  })

  it('should render audio and mood segments and regenerate selected positions', async () => {
    const harness = createEditorHarness()
    harness.setAudioUrl('blob:audio')
    harness.setDuration(65_400)
    harness.setCanRegenerate(true)
    harness.setRegeneratingIndex(1)
    harness.setSegments([
      {
        durationMs: 1_000,
        index: 0,
        startMs: 0,
        text: '첫 문장',
      },
      {
        durationMs: 1_000,
        index: 1,
        mood: {
          margin: 0.5,
          modifiers: [],
          primary: {id: 'cheerful', probability: 0.9},
          scores: [{id: 'cheerful', probability: 0.9}],
          secondary: null,
          uncertain: false,
        },
        startMs: 65_000,
        text: '둘째 문장',
      },
    ])
    renderEditor(harness)

    expect(screen.getByText('AI 생성 음성 · 1:05')).toBeInTheDocument()
    expect(screen.getAllByText('0:00')).not.toHaveLength(0)
    expect(screen.getAllByText('1:05')).not.toHaveLength(0)
    expect(screen.getByRole('button', {name: '전체 미리 듣기 재생'})).toBeInTheDocument()
    expect(screen.getByTestId('face-icon')).toHaveAttribute('data-mood', 'cheerful')
    expect(screen.getByTestId('face-icon')).toHaveAttribute('data-scene-style', 'scribble')
    expect(screen.getByRole('button', {name: '2번 말풍선 음성 다시 만들기'})).toHaveTextContent(
      '만드는 중…',
    )
    const regenerateButton = screen.getByRole('button', {
      name: '1번 말풍선 음성 다시 만들기',
    })
    expect(regenerateButton).toHaveTextContent('다시 만들기')
    expect(regenerateButton).toHaveAttribute(
      'aria-description',
      '전체 음성을 새로 만든 뒤 사용할 수 있어요.',
    )
    expect(regenerateButton).not.toHaveAttribute('title')
    expect(screen.getByText('둘째 문장').parentElement).toHaveClass(
      'pomo-dialogue-editor__segment-content',
    )
    expect(screen.getByTestId('face-icon').parentElement?.parentElement).toHaveClass(
      'pomo-dialogue-editor__segment-meta',
    )

    fireEvent.click(regenerateButton)
    fireEvent.click(screen.getByRole('button', {name: '2번 말풍선 음성 다시 만들기'}))
    expect(harness.controller.regenerateSegment).toHaveBeenNthCalledWith(1, 0)
    expect(harness.controller.regenerateSegment).toHaveBeenNthCalledWith(2, 1)
  })
})
