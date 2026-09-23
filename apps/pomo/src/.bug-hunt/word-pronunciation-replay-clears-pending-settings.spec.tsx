/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createLanguageLearningWordAudioRepository,
  type LanguageLearningWord,
  type LanguageLearningWordAudioRepository,
} from 'src/features/language-learning'
import * as automaticDialogueSettings from 'src/features/focus-room-dialogue/automatic-dialogue-settings'
import {type ModelAssetManager, useModelAssetManager} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {useLanguageLearningWordPronunciation} from 'src/components/language-learning/use-word-pronunciation'
import {generateLanguageLearningWordPronunciation} from 'src/components/language-learning/word-pronunciation'

vi.mock('src/features/model-download', () => ({useModelAssetManager: vi.fn()}))
vi.mock('src/features/language-learning', async () => {
  const actual = await vi.importActual<typeof import('src/features/language-learning')>(
    'src/features/language-learning',
  )
  return {...actual, createLanguageLearningWordAudioRepository: vi.fn()}
})
vi.mock('src/features/supertonic', () => ({isSupertonicModelDownloaded: vi.fn()}))
vi.mock('src/components/language-learning/word-pronunciation', () => ({
  generateLanguageLearningWordPronunciation: vi.fn(),
}))

const word: LanguageLearningWord = {
  createdAt: '2026-09-03T00:00:00.000Z',
  language: 'en',
  memorized: false,
  value: 'Home',
  version: 1,
}
const cachedWord: LanguageLearningWord = {...word, value: 'Wave'}

const createManager = () => ({
  runAfterModel: vi.fn(),
  runAfterVoiceModel: vi.fn(),
})

const createAudioRepository = () => {
  const remove = vi.fn<LanguageLearningWordAudioRepository['delete']>(async () => undefined)
  const get = vi.fn<LanguageLearningWordAudioRepository['get']>(async (requested) =>
    requested.value === 'Wave' ? new Blob(['cached']) : null,
  )
  const save = vi.fn<LanguageLearningWordAudioRepository['save']>(async () => undefined)
  return {delete: remove, get, save}
}

let manager: ReturnType<typeof createManager>
let audioRepository: ReturnType<typeof createAudioRepository>
let requestWord: (value: LanguageLearningWord) => void

const Harness = () => {
  const pronunciation = useLanguageLearningWordPronunciation()
  requestWord = pronunciation.request
  return (
    <div>
      <span data-testid="loading-home">{String(pronunciation.isLoading(word))}</span>
      <span data-testid="audio-home">{pronunciation.audioUrl(word) ?? ''}</span>
      <span data-testid="audio-wave">{pronunciation.audioUrl(cachedWord) ?? ''}</span>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  manager = createManager()
  audioRepository = createAudioRepository()
  vi.mocked(createLanguageLearningWordAudioRepository).mockReturnValue(
    audioRepository as LanguageLearningWordAudioRepository,
  )
  vi.mocked(useModelAssetManager).mockReturnValue(manager as ModelAssetManager)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(manager.runAfterVoiceModel).mockImplementation(async ({task}) => ({
    status: 'complete',
    value: await task(),
  }))
  vi.mocked(generateLanguageLearningWordPronunciation).mockResolvedValue({
    audio: new Blob(['audio']),
    status: 'complete',
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pronunciation')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should cancel pending settings pronunciation when another cached word is replayed', async () => {
  let resolveSettings: ((settings: unknown) => void) | undefined
  vi.spyOn(
    automaticDialogueSettings.createAutomaticDialoguePreferenceOptions().storage,
    'read',
  ).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSettings = resolve
      }),
  )
  render(() => <Harness />, {wrapper: PreferenceProvider})

  requestWord(cachedWord)
  await vi.waitFor(() =>
    expect(screen.getByTestId('audio-wave')).toHaveTextContent('blob:pronunciation'),
  )
  expect(generateLanguageLearningWordPronunciation).not.toHaveBeenCalled()

  requestWord(word)
  await vi.waitFor(() => expect(audioRepository.get).toHaveBeenCalledTimes(2))
  expect(screen.getByTestId('loading-home')).toHaveTextContent('true')

  requestWord(cachedWord)
  await Promise.resolve()
  expect(screen.getByTestId('loading-home')).toHaveTextContent('false')
})

it('should not resume pending settings pronunciation after replaying another cached word', async () => {
  let resolveSettings: ((settings: unknown) => void) | undefined
  vi.spyOn(
    automaticDialogueSettings.createAutomaticDialoguePreferenceOptions().storage,
    'read',
  ).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSettings = resolve
      }),
  )
  render(() => <Harness />, {wrapper: PreferenceProvider})

  requestWord(cachedWord)
  await vi.waitFor(() =>
    expect(screen.getByTestId('audio-wave')).toHaveTextContent('blob:pronunciation'),
  )

  requestWord(word)
  await vi.waitFor(() => expect(audioRepository.get).toHaveBeenCalledTimes(2))

  requestWord(cachedWord)
  await Promise.resolve()

  resolveSettings?.({modelId: 'int8', version: 1, voiceId: 'Hana'})
  await vi.waitFor(() =>
    expect(generateLanguageLearningWordPronunciation).toHaveBeenCalledOnce(),
  )
  expect(screen.getByTestId('audio-home')).toHaveTextContent('blob:pronunciation')
})
