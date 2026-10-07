/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createEffect} from 'solid-js'
import flushPromises from 'flush-promises'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {
  createLanguageLearningWordAudioRepository,
  type LanguageLearningWord,
  type LanguageLearningWordAudioRepository,
  LanguageLearningWordAudioStorageError,
} from '../../../features/language-learning'
import {type ModelAssetManager, useModelAssetManager} from '../../../features/model-download'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
import {useLanguageLearningWordPronunciation} from '../use-word-pronunciation'
import {generateLanguageLearningWordPronunciation} from '../word-pronunciation'

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
let requestWord: (value: LanguageLearningWord) => void
let removeWord: (value: LanguageLearningWord) => void
let autoplayRequests: string[]

const Harness = () => {
  const pronunciation = useLanguageLearningWordPronunciation()
  requestWord = pronunciation.request
  removeWord = pronunciation.remove
  createEffect(() => {
    const key = pronunciation.autoplayKey()
    if (key !== null) {
      autoplayRequests.push(key)
    }
  })
  return (
    <div>
      <span data-testid="loading">{String(pronunciation.isLoading(word))}</span>
      <span data-testid="audio">{pronunciation.audioUrl(word) ?? ''}</span>
      <span data-testid="error">{pronunciation.error() ?? ''}</span>
    </div>
  )
}

const renderPronunciation = () => render(() => <Harness />, {wrapper: PreferenceProvider})

beforeEach(() => {
  overwriteGetLocale(() => 'ko')
  vi.clearAllMocks()
  autoplayRequests = []
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
  vi.restoreAllMocks()
  overwriteGetLocale(originalGetLocale)
})

it('should not publish generated audio when saving it fails', async () => {
  vi.mocked(manager.runAfterVoiceModel).mockImplementation(async ({task}) => ({
    status: 'complete',
    value: await task(),
  }))
  audioRepository.save.mockRejectedValueOnce(
    new LanguageLearningWordAudioStorageError('write', {
      cause: new Error('quota exceeded'),
    }),
  )
  renderPronunciation()

  requestWord(word)
  await flushPromises()

  expect(screen.getByTestId('error')).not.toBeEmptyDOMElement()
  expect(screen.getByTestId('audio')).toBeEmptyDOMElement()
  expect(screen.getByTestId('loading')).toHaveTextContent('false')
  expect(audioRepository.save).toHaveBeenCalledOnce()
  expect(audioRepository.delete).not.toHaveBeenCalled()
  expect(URL.createObjectURL).not.toHaveBeenCalled()
  expect(autoplayRequests).toEqual([])
})

it('should retry failed saves and replay successful audio within the same mount', async () => {
  vi.mocked(manager.runAfterVoiceModel).mockImplementation(async ({task}) => ({
    status: 'complete',
    value: await task(),
  }))
  audioRepository.save.mockRejectedValueOnce(
    new LanguageLearningWordAudioStorageError('write', {
      cause: new Error('quota exceeded'),
    }),
  )
  renderPronunciation()

  requestWord(word)
  await flushPromises()

  expect(screen.getByTestId('audio')).toBeEmptyDOMElement()
  expect(screen.getByTestId('loading')).toHaveTextContent('false')
  expect(screen.getByTestId('error')).not.toBeEmptyDOMElement()

  requestWord(word)
  await flushPromises()

  const audioUrl = screen.getByTestId('audio').textContent
  expect(audioUrl).toBe('blob:pronunciation')
  expect(screen.getByTestId('error').textContent).toBe('')
  expect(audioRepository.get).toHaveBeenCalledTimes(2)
  expect(audioRepository.save).toHaveBeenCalledTimes(2)
  expect(generateLanguageLearningWordPronunciation).toHaveBeenCalledTimes(2)
  expect(URL.createObjectURL).toHaveBeenCalledOnce()

  requestWord(word)
  await flushPromises()

  expect(screen.getByTestId('audio').textContent).toBe(audioUrl)
  expect(audioRepository.get).toHaveBeenCalledTimes(2)
  expect(audioRepository.save).toHaveBeenCalledTimes(2)
  expect(generateLanguageLearningWordPronunciation).toHaveBeenCalledTimes(2)
  expect(autoplayRequests).toEqual(['en:Home', 'en:Home'])
})

it('should clean up a failed save from a cancelled request without publishing stale audio', async () => {
  let rejectSave: ((reason: unknown) => void) | undefined
  let startSave: (() => void) | undefined
  const saveStarted = new Promise<void>((resolve) => {
    startSave = resolve
  })
  vi.mocked(manager.runAfterVoiceModel).mockImplementation(async ({task}) => ({
    status: 'complete',
    value: await task(),
  }))
  audioRepository.save.mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectSave = reject
        startSave?.()
      }),
  )
  renderPronunciation()

  requestWord(word)
  await saveStarted
  removeWord(word)
  rejectSave?.(
    new LanguageLearningWordAudioStorageError('write', {
      cause: new Error('quota exceeded'),
    }),
  )
  await flushPromises()

  expect(screen.getByTestId('audio')).toBeEmptyDOMElement()
  expect(screen.getByTestId('loading')).toHaveTextContent('false')
  expect(screen.getByTestId('error')).toBeEmptyDOMElement()
  expect(audioRepository.delete).toHaveBeenNthCalledWith(1, word)
  expect(audioRepository.delete).toHaveBeenNthCalledWith(2, word, expect.any(String))
  expect(URL.createObjectURL).not.toHaveBeenCalled()
  expect(autoplayRequests).toEqual([])
})
