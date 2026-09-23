/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {
  createLanguageLearningWordAudioRepository,
  type LanguageLearningWord,
  type LanguageLearningWordAudioRepository,
} from '../features/language-learning'
import {type ModelAssetManager, useModelAssetManager} from '../features/model-download'
import {isSupertonicModelDownloaded} from '../features/supertonic'
import {
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
  type AutomaticDialogueSettings,
} from '../features/focus-room-dialogue/automatic-dialogue-settings-contract'
import {useLanguageLearningWordPronunciation} from '../components/language-learning/use-word-pronunciation'
import {generateLanguageLearningWordPronunciation} from '../components/language-learning/word-pronunciation'

const state = vi.hoisted(() => ({
  releaseAudioRead: () => undefined as void,
  settingsRead: Promise.withResolvers<AutomaticDialogueSettings>(),
}))

vi.mock('../features/focus-room-dialogue/automatic-dialogue-settings', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../features/focus-room-dialogue/automatic-dialogue-settings')
  >('../features/focus-room-dialogue/automatic-dialogue-settings')

  return {
    ...actual,
    createAutomaticDialoguePreferenceOptions: (options = {}) => ({
      ...actual.createAutomaticDialoguePreferenceOptions(options),
      storage: {
        read: () => state.settingsRead.promise,
        subscribe: () => () => undefined,
        write: () => null,
      },
    }),
  }
})

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

const originalGetLocale = getLocale

const createManager = () => ({
  runAfterModel: vi.fn(),
  runAfterVoiceModel: vi.fn(),
})

let manager: ReturnType<typeof createManager>
let audioRepository: LanguageLearningWordAudioRepository
let requestWord: (value: LanguageLearningWord) => void

const Harness = () => {
  const pronunciation = useLanguageLearningWordPronunciation()
  requestWord = pronunciation.request
  return (
    <div>
      <span data-testid="error">{pronunciation.error() ?? ''}</span>
      <span data-testid="audio">{pronunciation.audioUrl(word) ?? ''}</span>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  state.settingsRead = Promise.withResolvers<AutomaticDialogueSettings>()
  state.releaseAudioRead = () => undefined
  overwriteGetLocale(() => 'ko')
  vi.clearAllMocks()
  manager = createManager()
  audioRepository = {
    delete: vi.fn(async () => undefined),
    get: vi.fn(
      () =>
        new Promise<Blob | null>((resolve) => {
          state.releaseAudioRead = () => resolve(null)
        }),
    ),
    save: vi.fn(async () => undefined),
  }
  vi.mocked(createLanguageLearningWordAudioRepository).mockReturnValue(audioRepository)
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
  overwriteGetLocale(originalGetLocale)
})

it('should continue pronunciation after automatic dialogue settings finish hydrating', async () => {
  render(() => <Harness />, {wrapper: PreferenceProvider})

  requestWord(word)
  await vi.waitFor(() => expect(audioRepository.get).toHaveBeenCalledOnce())

  state.releaseAudioRead()
  await vi.waitFor(() =>
    expect(screen.getByTestId('error')).toHaveTextContent(
      '자동 음성 생성 설정이 아직 준비되지 않았어요.',
    ),
  )

  state.settingsRead.resolve(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
  await vi.waitFor(() =>
    expect(screen.getByTestId('audio')).toHaveTextContent('blob:pronunciation'),
  )
  expect(generateLanguageLearningWordPronunciation).toHaveBeenCalledOnce()
})
