/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {overwriteGetLocale} from '@paraglide/runtime'
import {
  createLanguageLearningWordAudioRepository,
  type LanguageLearningWord,
  type LanguageLearningWordAudioRepository,
  LanguageLearningWordAudioStorageError,
} from '../features/language-learning'
import {type ModelAssetManager, useModelAssetManager} from '../features/model-download'
import {isSupertonicModelDownloaded} from '../features/supertonic'
import {useLanguageLearningWordPronunciation} from '../components/language-learning/use-word-pronunciation'
import {generateLanguageLearningWordPronunciation} from '../components/language-learning/word-pronunciation'

vi.mock('../features/model-download', () => ({useModelAssetManager: vi.fn()}))
vi.mock('../features/language-learning', async () => {
  const actual = await vi.importActual<typeof import('../features/language-learning')>(
    '../features/language-learning',
  )
  return {...actual, createLanguageLearningWordAudioRepository: vi.fn()}
})
vi.mock('../features/supertonic', () => ({isSupertonicModelDownloaded: vi.fn()}))
vi.mock('../components/language-learning/word-pronunciation', () => ({
  generateLanguageLearningWordPronunciation: vi.fn(),
}))

const word: LanguageLearningWord = {
  createdAt: '2026-09-03T00:00:00.000Z',
  language: 'en',
  memorized: false,
  value: 'Home',
  version: 1,
}

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

const Harness = () => {
  const pronunciation = useLanguageLearningWordPronunciation()
  requestWord = pronunciation.request
  return (
    <div>
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
  vi.mocked(manager.runAfterVoiceModel).mockImplementation(async ({task}) => ({
    status: 'complete',
    value: await task(),
  }))
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pronunciation')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should not expose playback URL when persisting generated pronunciation fails', async () => {
  audioRepository.save.mockRejectedValueOnce(
    new LanguageLearningWordAudioStorageError('write', {cause: new Error('quota exceeded')}),
  )
  render(() => <Harness />, {wrapper: PreferenceProvider})

  requestWord(word)

  await vi.waitFor(() => expect(screen.getByTestId('error').textContent).not.toBe(''))
  expect(screen.getByTestId('audio')).toHaveTextContent('')
  expect(URL.createObjectURL).not.toHaveBeenCalled()
  expect(screen.getByTestId('loading')).toHaveTextContent('false')
})
