/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  createLanguageLearningWordAudioRepository,
  type LanguageLearningWord,
} from '../../../features/language-learning'
import {useModelAssetManager} from '../../../features/model-download'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
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

const composedWord: LanguageLearningWord = {
  createdAt: '2026-09-03T00:00:00.000Z',
  language: 'ko',
  memorized: false,
  value: '한글',
  version: 1,
}
const decomposedWord = {...composedWord, value: composedWord.value.normalize('NFD')}
const renderPronunciation = () => {
  let state: ReturnType<typeof useLanguageLearningWordPronunciation> | undefined
  const Harness = () => {
    state = useLanguageLearningWordPronunciation()
    return null
  }
  const view = render(() => <Harness />, {wrapper: PreferenceProvider})
  if (state === undefined) {
    throw new Error('발음 상태가 초기화되지 않았습니다.')
  }
  return {state, view}
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem(
    'pomo:automatic-dialogue-settings:v1',
    JSON.stringify({modelId: 'int8', version: 1, voiceId: 'Hana'}),
  )
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  vi.mocked(useModelAssetManager, {partial: true}).mockReturnValue({runAfterVoiceModel: vi.fn()})
  vi.mocked(createLanguageLearningWordAudioRepository).mockReturnValue({
    delete: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  })
  vi.spyOn(URL, 'createObjectURL')
    .mockReturnValueOnce('blob:composed')
    .mockReturnValue('blob:decomposed')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('should retain a pending word when only its other stored spelling is removed', async () => {
  const {state} = renderPronunciation()
  state.request(composedWord)
  await flushPromises()
  expect(state.pendingWord()).toEqual(composedWord)

  state.remove(decomposedWord)

  expect(state.pendingWord()).toEqual(composedWord)
})

it('should retain the other spelling audio URL when a stored spelling is removed', async () => {
  const audio = new Blob(['cached audio'])
  const repository = createLanguageLearningWordAudioRepository()
  vi.mocked(repository.get).mockResolvedValueOnce(audio)
  const {state, view} = renderPronunciation()
  state.request(composedWord)
  await flushPromises()
  expect(state.audioUrl(composedWord)).toBe('blob:composed')
  state.request(decomposedWord)
  await flushPromises()
  expect(repository.get).toHaveBeenCalledOnce()
  const retainedUrl = state.audioUrl(decomposedWord)
  expect(retainedUrl).not.toBeNull()

  state.remove(composedWord)

  expect(state.audioUrl(decomposedWord)).toBe(retainedUrl)
  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(retainedUrl)
  expect(repository.delete).toHaveBeenCalledWith(composedWord, undefined, {
    preserveSharedAudio: true,
  })
  state.remove(decomposedWord)
  expect(repository.delete).toHaveBeenCalledWith(decomposedWord)
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(retainedUrl)
  view.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(retainedUrl)
})

it('should preserve another spelling request while its audio save is pending', async () => {
  const save = Promise.withResolvers<void>()
  const repository = createLanguageLearningWordAudioRepository()
  vi.mocked(repository.save).mockReturnValueOnce(save.promise)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(useModelAssetManager, {partial: true}).mockReturnValue({
    runAfterVoiceModel: vi.fn().mockResolvedValue({
      status: 'complete',
      value: {audio: new Blob(['new audio']), status: 'complete'},
    }),
  })
  const {state} = renderPronunciation()
  state.request(decomposedWord)
  await flushPromises()
  expect(repository.save).toHaveBeenCalledOnce()
  expect(state.isLoading(decomposedWord)).toBe(true)

  state.remove(composedWord)

  expect(repository.delete).toHaveBeenCalledWith(composedWord, undefined, {
    preserveSharedAudio: true,
  })
  expect(state.isLoading(decomposedWord)).toBe(true)
  save.resolve()
  await flushPromises()
  expect(state.audioUrl(decomposedWord)).toBe('blob:composed')
  expect(state.isLoading(decomposedWord)).toBe(false)
})
