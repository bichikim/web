/** @vitest-environment jsdom */

import {A, useNavigate} from '@solidjs/router'
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

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
import {PFaceIcon} from '../../p-face-icon/PFaceIcon'
import {PGenerationStatus} from '../../p-generation-status/PGenerationStatus'
import {PModelDownloadConsent} from '../../p-model-download-consent/PModelDownloadConsent'
import {PDialogueDraftGenerator} from '../DraftGenerator'
import {PDialogueEditor} from '../Editor'

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
vi.mock('../DraftGenerator', () => ({PDialogueDraftGenerator: vi.fn()}))
vi.mock('../../p-face-icon/PFaceIcon', () => ({PFaceIcon: vi.fn()}))
vi.mock('../../p-generation-status/PGenerationStatus', () => ({PGenerationStatus: vi.fn()}))
vi.mock('../../p-model-download-consent/PModelDownloadConsent', () => ({
  PModelDownloadConsent: vi.fn(),
}))

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
const originalGetLocale = getLocale

const createModelDownload = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  downloads: () => [],
  startImageModel: vi.fn(),
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

const getVoiceSelect = () => screen.getByRole('button', {name: /목소리/})
const getLanguageSelect = () => screen.getByRole('button', {name: /언어/})
const getModelSelect = () => screen.getByRole('button', {name: /모델/})
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
  overwriteGetLocale(originalGetLocale)
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
    expect(screen.getByText('13 / 10000')).toBeInTheDocument()
    expect(screen.getByTestId('download-consent')).toHaveAttribute('data-download-size', '123 MB')

    fireEvent.input(screen.getByRole('textbox', {name: /대사/}), {
      target: {value: '직접 입력'},
    })
    expect(harness.controller.setText).toHaveBeenCalledWith('직접 입력')

    for (const [select, value] of [
      [getVoiceSelect(), 'F1'],
      [getLanguageSelect(), 'en'],
      [getModelSelect(), 'int8'],
    ] as const) {
      fireEvent.keyDown(select, {key: 'ArrowDown'})
      const option = document.querySelector(`[role="option"][data-key="${value}"]`)
      expect(option).not.toBeNull()
      fireEvent.click(option!)
    }
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
})
