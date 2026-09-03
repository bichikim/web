/** @vitest-environment jsdom */

import {useNavigate} from '@solidjs/router'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type ComponentProps, createSignal, onMount} from 'solid-js'
import {afterEach, beforeEach, expect, it, type Mock, vi} from 'vitest'

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
import {PGenerationStatus} from '../../PGenerationStatus'
import {PModelDownloadConsent} from '../../PModelDownloadConsent'
import {LanguageLearningEditorHeader} from '../EditorHeader'
import {LanguageLearningGenerateButton} from '../GenerateButton'
import LanguageLearningEditor from '../Editor'
import {LanguageLearningReview} from '../Review'
import {LanguageLearningSettings} from '../Settings'
import {saveLanguageLearningCandidates} from '../save'
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
vi.mock('../../PGenerationStatus', () => ({PGenerationStatus: vi.fn()}))
vi.mock('../../PModelDownloadConsent', () => ({PModelDownloadConsent: vi.fn()}))
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

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

function createDeferred<T>() {
  let resolve = (_value: T) => undefined
  const promise = new Promise<T>((nextResolve) => {
    resolve = (value) => {
      nextResolve(value)
    }
  })

  return {promise, resolve}
}

function getLatestProps<T>(mock: {readonly mock: {readonly calls: ReadonlyArray<readonly [T]>}}) {
  const props = mock.mock.calls.at(-1)?.[0]

  if (props === undefined) {
    throw new Error('컴포넌트 props가 준비되지 않았습니다.')
  }

  return props
}

const candidate = () => ({
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

let setWriterOutput: (value: string) => string
let setWriterState: (value: DialogueWriterState) => DialogueWriterState
let disposeRepository: Mock<() => void>
let generateWithPreparation: Mock<() => void>
let navigate: Mock<(to: string) => void>
let startTextModel: Mock<ModelDownloadController['startTextModel']>
let startVoiceModel: Mock<ModelDownloadController['startVoiceModel']>
let setModelDownloadState: (value: ModelDownloadState) => ModelDownloadState

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
    isBusy: () => false,
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

const completeTextGeneration = async (output = 'A useful sentence.') => {
  setWriterOutput(output)
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
}

const expectStatusMessage = async (pattern: RegExp) => {
  await waitFor(() =>
    expect(
      getLatestProps<ComponentProps<typeof PGenerationStatus>>(vi.mocked(PGenerationStatus))
        .message,
    ).toMatch(pattern),
  )
}

const renderGeneratedReview = async () => {
  setWriterState({status: 'idle'})
  vi.mocked(LanguageLearningReview).mockClear()
  const view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()
  return view
}

it('should generate, review, regenerate, toggle, and save a sentence', async () => {
  const result = render(() => <LanguageLearningEditor />)

  expect(result.container.querySelector('main')).toHaveClass(
    '[background:var(--pomo-editor-background)]',
    'text-foreground',
  )

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()

  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await waitFor(() => expect(regenerateCandidateVoice).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button', {name: 'toggle'}))
  fireEvent.click(screen.getByRole('button', {name: 'save'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'toggle'}))
  fireEvent.click(screen.getByRole('button', {name: 'save'}))

  await waitFor(() => expect(saveLanguageLearningCandidates).toHaveBeenCalledOnce())
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/')
  expect(disposeRepository).toHaveBeenCalledOnce()
})

it('should retry invalid text twice and then report the validation failure', async () => {
  vi.mocked(isValidLanguageLearningSentence).mockReturnValue(false)
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  for (let retry = 0; retry < 3; retry += 1) {
    setWriterState({status: 'generating'})
    setWriterState({status: 'complete'})
    // oxlint-disable-next-line eslint/no-await-in-loop -- Each retry is queued only after the previous completion is observed.
    await flush()
  }

  expect(
    screen.getByText('조건에 맞는 한 문장을 만들지 못했어요. 다시 시도해 주세요.'),
  ).toBeDefined()
})

it('should report writer errors and reject empty direct or saved prompts', async () => {
  vi.mocked(selectLanguageLearningPromptWords).mockReturnValue([])
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  expect(screen.getByText('프롬프트 단어를 하나 이상 입력해 주세요.')).toBeDefined()

  const wordSourceProps = getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
    vi.mocked(LanguageLearningWordSourceControl),
  )
  wordSourceProps.onSourceChange('saved')
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  expect(screen.getByText(/외우지 않은 학습 단어가 부족해요/)).toBeDefined()

  vi.mocked(selectLanguageLearningPromptWords).mockReturnValue(['word'])
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({message: 'writer failed', modelReady: false, status: 'error'})
  expect(screen.getByText('writer failed')).toBeDefined()
})

it('should download a missing text model and handle failed or cancelled downloads', async () => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  expect(
    getLatestProps<ComponentProps<typeof PModelDownloadConsent>>(vi.mocked(PModelDownloadConsent))
      .isOpen,
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()
  expect(startTextModel).toHaveBeenCalledOnce()

  setModelDownloadState({
    label: 'Gemma 4 E2B',
    percentage: 37,
    status: 'loading',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })
  expect(screen.getByRole('button', {name: 'generate'})).toBeDisabled()
  expect(
    getLatestProps<ComponentProps<typeof PGenerationStatus>>(vi.mocked(PGenerationStatus)),
  ).toMatchObject({
    kind: 'draft',
    message: 'Gemma 4 E2B 모델 받는 중 · 37%',
    progress: 37,
    progressLabel: '모델 다운로드 진행률',
  })
  setModelDownloadState({status: 'idle'})

  cleanup()
  setWriterState({status: 'idle'})
  startTextModel.mockResolvedValue({message: 'download failed', status: 'error'})
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()
  expect(screen.getByText('download failed')).toBeDefined()

  cleanup()
  setWriterState({status: 'idle'})
  startTextModel.mockResolvedValue({status: 'cancelled'})
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()
  expect(startTextModel).toHaveBeenCalled()
})

it('should start one text workflow while the installed-model check is pending', async () => {
  const modelCheck = createDeferred<boolean>()
  vi.mocked(isTextModelDownloaded).mockReturnValue(modelCheck.promise)
  render(() => <LanguageLearningEditor />)
  const generateButton = screen.getByRole('button', {name: 'generate'})

  fireEvent.click(generateButton)
  expect(generateButton).toBeDisabled()
  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
      vi.mocked(LanguageLearningSettings),
    ).disabled,
  ).toBe(true)
  getLatestProps<ComponentProps<typeof LanguageLearningGenerateButton>>(
    vi.mocked(LanguageLearningGenerateButton),
  ).onPress()
  modelCheck.resolve(true)
  await flush()

  expect(isTextModelDownloaded).toHaveBeenCalledOnce()
  expect(generateWithPreparation).toHaveBeenCalledOnce()
})

it('should report a text model check failure and unlock the editor', async () => {
  vi.mocked(isTextModelDownloaded).mockRejectedValue(new Error('model storage failed'))
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()

  expect(screen.getByText('학습 문장을 만들지 못했어요.')).toBeDefined()
  expect(screen.getByRole('button', {name: 'generate'})).not.toBeDisabled()
  expect(generateWithPreparation).not.toHaveBeenCalled()
})

it('should cancel or complete a missing all-sentence voice model download', async () => {
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'cancel download'}))
  expect(screen.getByText('단어와 설정을 정한 뒤 만들기를 눌러 주세요.')).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await flush()
  startVoiceModel.mockResolvedValueOnce({status: 'cancelled'})
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await expectStatusMessage(/단어와 설정을 정한 뒤/)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
  expect(startVoiceModel).toHaveBeenCalledTimes(2)
})

it('should change source and language while keeping saved words available only when eligible', () => {
  render(() => <LanguageLearningEditor />)
  const sourceProps = getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
    vi.mocked(LanguageLearningWordSourceControl),
  )
  const settingsProps = getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
    vi.mocked(LanguageLearningSettings),
  )

  sourceProps.onInputChange('pending')
  sourceProps.onWordsChange(['word'])
  sourceProps.onSourceChange('saved')
  settingsProps.onCountChange(2)
  settingsProps.onModelChange('int8')
  settingsProps.onVoiceChange('Hana')
  settingsProps.onLanguageChange('ko')
  vi.mocked(getUnmemorizedLanguageLearningWordValues).mockReturnValue([])
  settingsProps.onLanguageChange('ja')

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
})

it('should generate every requested sentence before starting voice generation', async () => {
  render(() => <LanguageLearningEditor />)
  const settingsProps = getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
    vi.mocked(LanguageLearningSettings),
  )
  settingsProps.onCountChange(2)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterOutput('First sentence.')
  setWriterState({status: 'complete'})
  await flush()
  expect(LanguageLearningReview).not.toHaveBeenCalled()
  setWriterOutput('Second sentence.')
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})

  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
  expect(generateVoiceCandidates).toHaveBeenCalledWith(
    expect.objectContaining({sentences: ['First sentence.', 'Second sentence.']}),
  )
  fireEvent.click(screen.getByRole('button', {name: 'toggle'}))
  const reviewProps = getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  )
  reviewProps.onToggle('missing')
  await reviewProps.onRegenerate(reviewProps.candidates[0]?.id ?? 'missing')
})

it('should report voice workflow and model-check failures', async () => {
  vi.mocked(generateVoiceCandidates).mockResolvedValue({
    message: 'voice workflow failed',
    status: 'error',
  })
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await flush()
  await expectStatusMessage(/voice workflow failed/)

  cleanup()
  setWriterState({status: 'idle'})
  vi.mocked(generateVoiceCandidates).mockResolvedValue({status: 'cancelled'})
  vi.mocked(isSupertonicModelDownloaded).mockRejectedValue(new Error('model check failed'))
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await flush()
  await expectStatusMessage(/음성을 만들지 못했어요/)
})

it('should report save failures', async () => {
  vi.mocked(saveLanguageLearningCandidates).mockRejectedValue(new Error('save failed'))
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', {name: 'save'}))
  await flush()
  await expectStatusMessage(/저장하지 못했어요/)
})

it('should handle missing and failed candidate voice regeneration', async () => {
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()
  const reviewProps = getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  )

  await reviewProps.onRegenerate('missing')
  vi.mocked(isSupertonicModelDownloaded).mockRejectedValueOnce(new Error('check failed'))
  await reviewProps.onRegenerate(reviewProps.candidates[0]?.id ?? 'missing')
  await expectStatusMessage(/음성을 만들지 못했어요/)
})

it('should handle candidate voice downloads and workflow results', async () => {
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()
  const candidateId = getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).candidates[0]?.id
  if (candidateId === undefined) {
    throw new Error('학습 문장 후보가 준비되지 않았습니다.')
  }

  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  expect(
    getLatestProps<ComponentProps<typeof PModelDownloadConsent>>(vi.mocked(PModelDownloadConsent))
      .actionLabel,
  ).toBe('목소리 다시 만들기')
  fireEvent.click(screen.getByRole('button', {name: 'cancel download'}))

  startVoiceModel.mockResolvedValueOnce({message: 'candidate download failed', status: 'error'})
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  fireEvent.click(screen.getByRole('button', {name: 'cancel download'}))
  await expectStatusMessage(/candidate download failed/)

  startVoiceModel.mockResolvedValueOnce({status: 'cancelled'})
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()

  startVoiceModel.mockResolvedValueOnce({status: 'complete'})
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await waitFor(() => expect(regenerateCandidateVoice).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))

  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(regenerateCandidateVoice).mockResolvedValueOnce({
    message: 'candidate voice failed',
    status: 'error',
  })
  await getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).onRegenerate(candidateId)
  await expectStatusMessage(/candidate voice failed/)

  vi.mocked(regenerateCandidateVoice).mockResolvedValueOnce({status: 'cancelled'})
  await getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).onRegenerate(candidateId)

  vi.mocked(regenerateCandidateVoice).mockResolvedValueOnce({
    candidate: {...candidate(), audioUrl: 'blob:replacement'},
    status: 'complete',
  })
  await getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).onRegenerate(candidateId)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:generated')
})

it('should keep direct word entry when changing the learning language', () => {
  render(() => <LanguageLearningEditor />)
  const settingsProps = getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
    vi.mocked(LanguageLearningSettings),
  )

  settingsProps.onLanguageChange('ko')

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
})

it('should restore the last selected word source after reopening the editor', () => {
  localStorage.setItem(
    'pomo:language-learning:word-source:v1',
    JSON.stringify({source: 'saved', version: 1}),
  )
  let view = render(() => <LanguageLearningEditor />)

  const sourceProps = getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
    vi.mocked(LanguageLearningWordSourceControl),
  )
  expect(sourceProps.source).toBe('saved')

  sourceProps.onSourceChange('direct')
  expect(JSON.parse(localStorage.getItem('pomo:language-learning:word-source:v1') ?? '')).toEqual({
    source: 'direct',
    version: 1,
  })

  view.unmount()
  vi.mocked(LanguageLearningWordSourceControl).mockClear()
  view = render(() => <LanguageLearningEditor />)

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
  view.unmount()
})

it('should validate a saved-word preference after persisted words load on mount', () => {
  localStorage.setItem(
    'pomo:language-learning:word-source:v1',
    JSON.stringify({source: 'saved', version: 1}),
  )
  vi.mocked(useLanguageLearningWords).mockImplementation(() => {
    const [words, setWords] = createSignal<ReadonlyArray<{readonly value: string}>>([])
    onMount(() => setWords([{value: 'one'}, {value: 'two'}, {value: 'three'}]))
    return words as ReturnType<typeof useLanguageLearningWords>
  })
  vi.mocked(getUnmemorizedLanguageLearningWordValues).mockImplementation(({words}) =>
    words.map((word) => word.value),
  )

  render(() => <LanguageLearningEditor />)

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('saved')
  expect(JSON.parse(localStorage.getItem('pomo:language-learning:word-source:v1') ?? '')).toEqual({
    source: 'saved',
    version: 1,
  })
})

it('should replace an unavailable saved-word preference with direct entry', () => {
  localStorage.setItem(
    'pomo:language-learning:word-source:v1',
    JSON.stringify({source: 'saved', version: 1}),
  )
  vi.mocked(getUnmemorizedLanguageLearningWordValues).mockReturnValue([])

  render(() => <LanguageLearningEditor />)

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
  expect(JSON.parse(localStorage.getItem('pomo:language-learning:word-source:v1') ?? '')).toEqual({
    source: 'direct',
    version: 1,
  })
})

it('should stop every pending workflow after the editor is disposed', async () => {
  const textCheck = createDeferred<boolean>()
  vi.mocked(isTextModelDownloaded).mockReturnValueOnce(textCheck.promise)
  let view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await waitFor(() => expect(isTextModelDownloaded).toHaveBeenCalled())
  view.unmount()
  textCheck.resolve(true)
  await flush()

  const textDownload =
    createDeferred<Awaited<ReturnType<ModelDownloadController['startTextModel']>>>()
  setWriterState({status: 'idle'})
  vi.mocked(isTextModelDownloaded).mockResolvedValueOnce(false)
  startTextModel.mockReturnValueOnce(textDownload.promise)
  view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await waitFor(() => expect(startTextModel).toHaveBeenCalled())
  view.unmount()
  textDownload.resolve({status: 'complete'})
  await flush()

  const voiceCheck = createDeferred<boolean>()
  setWriterState({status: 'idle'})
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(voiceCheck.promise)
  view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await waitFor(() => expect(isSupertonicModelDownloaded).toHaveBeenCalled())
  view.unmount()
  voiceCheck.resolve(true)
  await flush()

  const voiceGeneration = createDeferred<Awaited<ReturnType<typeof generateVoiceCandidates>>>()
  vi.mocked(generateVoiceCandidates).mockReturnValueOnce(voiceGeneration.promise)
  setWriterState({status: 'idle'})
  view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await waitFor(() => expect(generateVoiceCandidates).toHaveBeenCalled())
  view.unmount()
  voiceGeneration.resolve({candidates: [candidate()], status: 'complete'})
  await flush()

  view = await renderGeneratedReview()
  const regenerateCheck = createDeferred<boolean>()
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(regenerateCheck.promise)
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  view.unmount()
  regenerateCheck.resolve(true)
  await flush()

  view = await renderGeneratedReview()
  const regeneration = createDeferred<Awaited<ReturnType<typeof regenerateCandidateVoice>>>()
  vi.mocked(regenerateCandidateVoice).mockReturnValueOnce(regeneration.promise)
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await waitFor(() => expect(regenerateCandidateVoice).toHaveBeenCalled())
  view.unmount()
  regeneration.resolve({
    candidate: {...candidate(), audioUrl: 'blob:disposed-regeneration'},
    status: 'complete',
  })
  await flush()

  view = await renderGeneratedReview()
  const save = createDeferred<void>()
  vi.mocked(saveLanguageLearningCandidates).mockReturnValueOnce(save.promise)
  fireEvent.click(screen.getByRole('button', {name: 'save'}))
  await waitFor(() => expect(saveLanguageLearningCandidates).toHaveBeenCalled())
  view.unmount()
  save.resolve(undefined)
  await flush()
})
