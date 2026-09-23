import {useNavigate} from '@solidjs/router'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, type Mock, vi} from 'vitest'
import {PreferenceProvider} from '../../../hooks/use-preference'
import {type DialogueWriterState, useDialogueWriter} from '../../../features/dialogue-writer'
import {createPDialogueRepository} from '../../../features/focus-room-dialogue'
import {
  getUnmemorizedLanguageLearningWordValues,
  isValidLanguageLearningSentence,
  normalizeLanguageLearningSentence,
  selectLanguageLearningPromptWords,
  useLanguageLearningWords,
} from '../../../features/language-learning'
import {type ModelDownloadState, useModelDownload} from '../../../features/model-download'
import type {ModelDownloadController} from '../../../features/model-download/controller'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
import {isTextModelDownloaded} from '../../../features/text-generation'
import {PGenerationStatus} from '../../p-generation-status/PGenerationStatus'
import {PModelDownloadConsent} from '../../p-model-download-consent/PModelDownloadConsent'
import {LanguageLearningEditor} from '../Editor'
import {LanguageLearningEditorHeader} from '../EditorHeader'
import {LanguageLearningGenerateButton} from '../GenerateButton'
import {LanguageLearningReview} from '../Review'
import {saveLanguageLearningCandidates} from '../save'
import {LanguageLearningSettings} from '../Settings'
import {generateVoiceCandidates, regenerateCandidateVoice} from '../voice-generation'
import {LanguageLearningWordSourceControl} from '../WordSource'

vi.mock('@solidjs/router', () => ({useNavigate: vi.fn()}))
vi.mock('../../../features/dialogue-writer', () => ({useDialogueWriter: vi.fn()}))
vi.mock('../../../features/focus-room-dialogue', () => ({
  createPDialogueRepository: vi.fn(),
}))
vi.mock('../../../features/language-learning', async () => {
  const actual = await vi.importActual('../../../features/language-learning')

  return {
    ...actual,
    createLanguageLearningPrompt: vi.fn(() => 'prompt'),
    getUnmemorizedLanguageLearningWordValues: vi.fn(),
    isValidLanguageLearningSentence: vi.fn(),
    normalizeLanguageLearningSentence: vi.fn(),
    selectLanguageLearningPromptWords: vi.fn(),
    useLanguageLearningWords: vi.fn(),
  }
})
vi.mock('../../../features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../../../features/model-storage', () => ({formatModelDownloadSize: vi.fn(() => '1 MB')}))
vi.mock('../../../features/supertonic', () => ({
  getSupertonicModel: vi.fn(() => ({size: 1})),
  isSupertonicModelDownloaded: vi.fn(),
}))
vi.mock('../../../features/text-generation', () => ({
  getTextModel: vi.fn(() => ({downloadSize: '2 MB'})),
  isTextModelDownloaded: vi.fn(),
}))
vi.mock('../../p-generation-status/PGenerationStatus', () => ({PGenerationStatus: vi.fn()}))
vi.mock('../../p-model-download-consent/PModelDownloadConsent', () => ({
  PModelDownloadConsent: vi.fn(),
}))
vi.mock('../EditorHeader', () => ({LanguageLearningEditorHeader: vi.fn()}))
vi.mock('../GenerateButton', () => ({LanguageLearningGenerateButton: vi.fn()}))
vi.mock('../Review', () => ({LanguageLearningReview: vi.fn()}))
vi.mock('../Settings', () => ({LanguageLearningSettings: vi.fn()}))
vi.mock('../save', () => ({saveLanguageLearningCandidates: vi.fn()}))
vi.mock('../voice-generation', () => ({
  generateVoiceCandidates: vi.fn(),
  regenerateCandidateVoice: vi.fn(),
}))
vi.mock('../WordSource', () => ({LanguageLearningWordSourceControl: vi.fn()}))

export const LanguageLearningEditorWithPreferences = () => (
  <PreferenceProvider>
    <LanguageLearningEditor />
  </PreferenceProvider>
)

export const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const isWriterBusy = (state: DialogueWriterState) => {
  switch (state.status) {
    case 'generating':
    case 'loading':
      return true
    case 'complete':
    case 'error':
    case 'idle':
    case 'ready':
    case 'unsupported':
      return false
  }
}

export function createDeferred<T>() {
  const {promise, resolve} = Promise.withResolvers<T>()
  return {promise, resolve}
}

export function getLatestProps<T>(mock: {
  readonly mock: {readonly calls: ReadonlyArray<readonly [T]>}
}) {
  const props = mock.mock.calls.at(-1)?.[0]

  if (props === undefined) {
    throw new Error('컴포넌트 props가 준비되지 않았습니다.')
  }

  return props
}

export const candidate = () => ({
  audio: new Blob(['audio']),
  audioKey: 'audio-key',
  audioUrl: 'blob:generated',
  durationMs: 1000,
  id: 'candidate-id',
  modelId: 'full' as const,
  segments: [],
  selected: true,
  text: 'A useful sentence.',
  voiceId: 'Yuna' as const,
})

export let setWriterOutput: (value: string) => string
export let setWriterState: (value: DialogueWriterState) => DialogueWriterState
export let disposeRepository: Mock<() => void>
export let generateWithPreparation: Mock<() => void>
export let navigate: Mock<(to: string) => void>
export let startTextModel: Mock<ModelDownloadController['startTextModel']>
export let startVoiceModel: Mock<ModelDownloadController['startVoiceModel']>
export let setModelDownloadState: (value: ModelDownloadState) => ModelDownloadState

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  const [writerOutput, updateWriterOutput] = createSignal('A useful sentence.')
  const [writerState, updateWriterState] = createSignal<DialogueWriterState>({status: 'idle'})
  const [modelDownloadState, updateModelDownloadState] = createSignal<ModelDownloadState>({
    status: 'idle',
  })
  setWriterOutput = updateWriterOutput
  setWriterState = updateWriterState
  setModelDownloadState = updateModelDownloadState
  disposeRepository = vi.fn()
  generateWithPreparation = vi.fn()
  navigate = vi.fn<(to: string) => void>()
  startTextModel = vi.fn<ModelDownloadController['startTextModel']>().mockResolvedValue({
    status: 'complete',
  })
  startVoiceModel = vi.fn<ModelDownloadController['startVoiceModel']>().mockResolvedValue({
    status: 'complete',
  })

  vi.mocked(useNavigate).mockReturnValue(navigate as unknown as ReturnType<typeof useNavigate>)
  vi.mocked(useDialogueWriter).mockReturnValue({
    canCopy: () => false,
    canGenerate: () => true,
    canPrepare: () => true,
    copyOutput: vi.fn(),
    generate: vi.fn(),
    generateWithPreparation,
    isBusy: () => isWriterBusy(writerState()),
    isModelReady: () => true,
    output: writerOutput,
    prepare: vi.fn(),
    progress: () => 0,
    release: vi.fn(),
    request: () => '',
    setRequest: vi.fn(),
    state: writerState,
    statusMessage: () => '',
  })
  vi.mocked(useLanguageLearningWords).mockReturnValue(() => [])
  vi.mocked(getUnmemorizedLanguageLearningWordValues).mockReturnValue([
    'saved-1',
    'saved-2',
    'saved-3',
  ])
  vi.mocked(selectLanguageLearningPromptWords).mockReturnValue(['word'])
  vi.mocked(normalizeLanguageLearningSentence).mockImplementation((value) => value)
  vi.mocked(isValidLanguageLearningSentence).mockReturnValue(true)
  vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(createPDialogueRepository).mockReturnValue({
    dispose: disposeRepository,
  } as unknown as ReturnType<typeof createPDialogueRepository>)
  vi.mocked(saveLanguageLearningCandidates).mockResolvedValue(undefined)
  vi.mocked(generateVoiceCandidates).mockResolvedValue({
    candidates: [candidate()],
    status: 'complete',
  })
  vi.mocked(regenerateCandidateVoice).mockImplementation(async (options) => ({
    candidate: {...options.candidate, audioUrl: 'blob:regenerated'},
    status: 'complete',
  }))
  vi.mocked(useModelDownload).mockReturnValue({
    cancel: vi.fn(),
    dismissError: vi.fn(),
    dispose: vi.fn(),
    downloads: () => [],
    startImageModel: vi.fn(),
    startTextModel,
    startVoiceModel,
    state: modelDownloadState,
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:generated')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

  vi.mocked(LanguageLearningEditorHeader).mockImplementation(() => <h1>editor</h1>)
  vi.mocked(PGenerationStatus).mockImplementation((props) => (
    <p
      data-kind={props.kind}
      data-progress={String(props.progress)}
      data-progress-label={props.progressLabel}
    >
      {props.message}
    </p>
  ))
  vi.mocked(LanguageLearningGenerateButton).mockImplementation((props) => (
    <button disabled={props.disabled} onClick={() => props.onPress()} type="button">
      generate
    </button>
  ))
  vi.mocked(LanguageLearningWordSourceControl).mockImplementation((props) => (
    <div
      data-disabled={String(props.disabled)}
      data-input={props.inputValue}
      data-saved-count={props.savedWordCount}
      data-source={props.source}
      data-words={props.words.join(',')}
    >
      words
    </div>
  ))
  vi.mocked(LanguageLearningSettings).mockImplementation((props) => (
    <div
      data-count={props.count}
      data-disabled={String(props.disabled)}
      data-language={props.language}
      data-model={props.modelId}
      data-sentence-disabled={String(props.sentenceDisabled)}
      data-voice={props.voiceId}
    >
      settings
    </div>
  ))
  vi.mocked(LanguageLearningReview).mockImplementation((props) => (
    <div data-busy={String(props.busy)} data-regenerating={props.regeneratingCandidateId ?? ''}>
      <button onClick={() => props.onToggle(props.candidates[0]?.id ?? 'missing')} type="button">
        toggle
      </button>
      <button
        onClick={() => props.onRegenerate(props.candidates[0]?.id ?? 'missing')}
        type="button"
      >
        regenerate
      </button>
      <button onClick={() => props.onSave()} type="button">
        save
      </button>
    </div>
  ))
  vi.mocked(PModelDownloadConsent).mockImplementation((props) => (
    <div data-open={String(props.isOpen)}>
      <span>{props.actionLabel}</span>
      <span>{props.downloadSize}</span>
      <button onClick={() => props.onCancel()} type="button">
        cancel download
      </button>
      <button onClick={() => props.onConfirm()} type="button">
        confirm download
      </button>
    </div>
  ))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

export const completeTextGeneration = async (output = 'A useful sentence.') => {
  setWriterOutput(output)
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
}

export const expectStatusMessage = async (pattern: RegExp) => {
  await waitFor(() =>
    expect(
      getLatestProps<ComponentProps<typeof PGenerationStatus>>(vi.mocked(PGenerationStatus))
        .message,
    ).toMatch(pattern),
  )
}

export const renderGeneratedReview = async () => {
  setWriterState({status: 'idle'})
  vi.mocked(LanguageLearningReview).mockClear()
  const view = render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()
  return view
}
