/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createLanguageLearningWordAudioRepository,
  type LanguageLearningWord,
  type LanguageLearningWordAudioRepository,
  LanguageLearningWordAudioStorageError,
} from '../../../features/language-learning'
import {type ModelAssetManager, useModelAssetManager} from '../../../features/model-download'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {generateLanguageLearningWordPronunciation} from '../word-pronunciation'
import {useLanguageLearningWordPronunciation} from '../use-word-pronunciation'

vi.mock('../../../features/model-download', () => ({useModelAssetManager: vi.fn()}))
vi.mock('../../../features/language-learning', async () => {
  const actual = await vi.importActual<typeof import('../../../features/language-learning')>(
    '../../../features/language-learning',
  )
  return {...actual, createLanguageLearningWordAudioRepository: vi.fn()}
})
vi.mock('../../../features/supertonic', () => ({isSupertonicModelDownloaded: vi.fn()}))
vi.mock('../word-pronunciation', () => ({generateLanguageLearningWordPronunciation: vi.fn()}))

const word: LanguageLearningWord = {
  createdAt: '2026-09-03T00:00:00.000Z',
  language: 'en',
  memorized: false,
  value: 'Home',
  version: 1,
}
const originalGetLocale = getLocale

const createManager = () => ({
  runAfterModel: vi.fn(),
  runAfterVoiceModel: vi.fn(),
})

const createAudioRepository = () => {
  const remove = vi.fn<LanguageLearningWordAudioRepository['delete']>(async () => undefined)
  const get = vi.fn<LanguageLearningWordAudioRepository['get']>(async () => null)
  const save = vi.fn<LanguageLearningWordAudioRepository['save']>(async () => undefined)
  return {delete: remove, get, save}
}

let manager: ReturnType<typeof createManager>
let audioRepository: ReturnType<typeof createAudioRepository>
let pendingWord: () => LanguageLearningWord | null
let requestWord: (value: LanguageLearningWord) => void
let confirmDownload: () => void
let cancelDownload: () => void
let removeWord: (value: LanguageLearningWord) => void

const Harness = () => {
  const pronunciation = useLanguageLearningWordPronunciation()
  pendingWord = pronunciation.pendingWord
  requestWord = pronunciation.request
  confirmDownload = pronunciation.confirmDownload
  cancelDownload = pronunciation.cancelDownload
  removeWord = pronunciation.remove
  return (
    <div>
      <span data-testid="pending">{pendingWord()?.value ?? ''}</span>
      <span data-testid="loading">{String(pronunciation.isLoading(word))}</span>
      <span data-testid="audio">{pronunciation.audioUrl(word) ?? ''}</span>
      <span data-testid="error">{pronunciation.error() ?? ''}</span>
    </div>
  )
}

beforeEach(() => {
  overwriteGetLocale(() => 'ko')
  vi.clearAllMocks()
  manager = createManager()
  audioRepository = createAudioRepository()
  vi.mocked(createLanguageLearningWordAudioRepository).mockReturnValue(
    audioRepository as LanguageLearningWordAudioRepository,
  )
  vi.mocked(useModelAssetManager).mockReturnValue(manager as ModelAssetManager)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  localStorage.setItem(
    'pomo:automatic-dialogue-settings:v1',
    JSON.stringify({modelId: 'int8', version: 1, voiceId: 'Hana'}),
  )
  vi.mocked(generateLanguageLearningWordPronunciation).mockResolvedValue({
    audio: new Blob(['audio']),
    status: 'complete',
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pronunciation')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should localize word-audio storage failures at the UI boundary', async () => {
  overwriteGetLocale(() => 'en')
  audioRepository.get.mockRejectedValueOnce(
    new LanguageLearningWordAudioStorageError('read', {cause: new Error('cache unavailable')}),
  )
  render(() => <Harness />)

  requestWord(word)

  await vi.waitFor(() =>
    expect(screen.getByTestId('error')).toHaveTextContent(
      'The saved word pronunciation could not be loaded.',
    ),
  )
})

it('should generate a pronunciation with a ready model and expose the audio URL', async () => {
  vi.mocked(manager.runAfterVoiceModel).mockImplementation(async ({task}) => ({
    status: 'complete',
    value: await task(),
  }))
  render(() => <Harness />)

  requestWord(word)

  await vi.waitFor(() =>
    expect(screen.getByTestId('audio')).toHaveTextContent('blob:pronunciation'),
  )
  expect(generateLanguageLearningWordPronunciation).toHaveBeenCalledWith({
    language: 'en',
    modelId: 'int8',
    text: 'Home',
    voiceId: 'Hana',
  })
  expect(audioRepository.save).toHaveBeenCalledOnce()
  expect(manager.runAfterVoiceModel).toHaveBeenCalledWith(
    expect.objectContaining({
      downloadIfMissing: false,
      modelId: 'int8',
      task: expect.any(Function),
    }),
  )
  expect(screen.getByTestId('loading')).toHaveTextContent('false')
})

it('should ask for consent when the model disappears after the initial readiness check', async () => {
  vi.mocked(manager.runAfterVoiceModel)
    .mockResolvedValueOnce({status: 'missing'})
    .mockImplementationOnce(async ({task}) => ({status: 'complete', value: await task()}))
  render(() => <Harness />)

  requestWord(word)

  await vi.waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('Home'))
  expect(generateLanguageLearningWordPronunciation).not.toHaveBeenCalled()

  confirmDownload()
  await vi.waitFor(() =>
    expect(screen.getByTestId('audio')).toHaveTextContent('blob:pronunciation'),
  )
  expect(manager.runAfterVoiceModel).toHaveBeenLastCalledWith(
    expect.objectContaining({downloadIfMissing: true}),
  )
})

it('should invalidate active pronunciation work before deleting its cached audio', async () => {
  let resolveResult:
    | ((value: {
        readonly status: 'complete'
        readonly value: {
          readonly audio: Blob
          readonly status: 'complete'
        }
      }) => void)
    | undefined
  vi.mocked(manager.runAfterVoiceModel).mockReturnValue(
    new Promise((resolve) => {
      resolveResult = resolve
    }),
  )
  render(() => <Harness />)

  requestWord(word)
  await vi.waitFor(() => expect(manager.runAfterVoiceModel).toHaveBeenCalledOnce())
  removeWord(word)
  expect(screen.getByTestId('loading')).toHaveTextContent('false')
  resolveResult?.({status: 'complete', value: {audio: new Blob(['late']), status: 'complete'}})
  await Promise.resolve()

  expect(audioRepository.delete).toHaveBeenCalledWith(word)
  expect(audioRepository.save).not.toHaveBeenCalled()
  expect(screen.getByTestId('audio')).toHaveTextContent('')
})

it('should ask before downloading a missing model and continue the word after confirmation', async () => {
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  vi.mocked(manager.runAfterVoiceModel).mockImplementation(async ({task}) => ({
    status: 'complete',
    value: await task(),
  }))
  render(() => <Harness />)

  requestWord(word)
  await vi.waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('Home'))
  expect(manager.runAfterVoiceModel).not.toHaveBeenCalled()

  confirmDownload()
  await vi.waitFor(() =>
    expect(screen.getByTestId('audio')).toHaveTextContent('blob:pronunciation'),
  )
  expect(manager.runAfterVoiceModel).toHaveBeenCalledOnce()
})

it('should reuse saved word audio without checking the model or generating again', async () => {
  audioRepository.get.mockResolvedValueOnce(new Blob(['saved audio']))
  render(() => <Harness />)

  requestWord(word)

  await vi.waitFor(() =>
    expect(screen.getByTestId('audio')).toHaveTextContent('blob:pronunciation'),
  )
  expect(isSupertonicModelDownloaded).not.toHaveBeenCalled()
  expect(manager.runAfterVoiceModel).not.toHaveBeenCalled()
  expect(generateLanguageLearningWordPronunciation).not.toHaveBeenCalled()
})

it('should cancel a pending download without running a task', async () => {
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <Harness />)

  requestWord(word)
  await vi.waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('Home'))
  cancelDownload()

  expect(screen.getByTestId('pending')).toHaveTextContent('')
  expect(manager.runAfterVoiceModel).not.toHaveBeenCalled()
})

it('should report preparation, generation, and download failures', async () => {
  vi.mocked(isSupertonicModelDownloaded).mockRejectedValueOnce(new Error('storage unavailable'))
  render(() => <Harness />)
  requestWord(word)
  await vi.waitFor(() =>
    expect(screen.getByTestId('error')).toHaveTextContent('storage unavailable'),
  )

  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(manager.runAfterVoiceModel).mockResolvedValue({
    message: 'download failed',
    status: 'error',
  })
  requestWord(word)
  await vi.waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('download failed'))

  vi.mocked(manager.runAfterVoiceModel).mockResolvedValue({
    status: 'complete',
    value: {message: 'generation failed', status: 'error'},
  })
  requestWord(word)
  await vi.waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('generation failed'))
})
