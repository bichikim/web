/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  createLanguageLearningWordAudioRepository,
  deleteLanguageLearningWord,
  type LanguageLearningWord,
  writeLanguageLearningWords,
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
const spellings = [
  {removed: composedWord, retained: decomposedWord},
  {removed: decomposedWord, retained: composedWord},
]
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
  localStorage.clear()
  localStorage.setItem(
    'pomo:automatic-dialogue-settings:v1',
    JSON.stringify({modelId: 'int8', version: 1, voiceId: 'Hana'}),
  )
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(useModelAssetManager, {partial: true}).mockReturnValue({
    runAfterVoiceModel: vi.fn().mockResolvedValue({
      status: 'complete',
      value: {audio: new Blob(['new audio']), status: 'complete'},
    }),
  })
  vi.mocked(createLanguageLearningWordAudioRepository).mockReturnValue({
    delete: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pronunciation')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it.each(spellings)(
  'should preserve persisted unrequested alias audio until its final row is deleted: $removed.value',
  async ({removed, retained}) => {
    writeLanguageLearningWords([removed, retained])
    const repository = createLanguageLearningWordAudioRepository()
    const {state, view} = renderPronunciation()
    expect(state.audioUrl(removed)).toBeNull()
    expect(state.audioUrl(retained)).toBeNull()

    deleteLanguageLearningWord(removed.language, removed.value)
    state.remove(removed)
    await flushPromises()

    expect(repository.delete).toHaveBeenNthCalledWith(1, removed, undefined, {
      preserveSharedAudio: true,
    })
    expect(repository.get).not.toHaveBeenCalled()
    deleteLanguageLearningWord(retained.language, retained.value)
    state.remove(retained)
    await flushPromises()
    expect(repository.delete).toHaveBeenNthCalledWith(2, retained)
    expect(state.error()).toBeNull()
    view.unmount()
  },
)

it.each(spellings)(
  'should preserve audio adopted by an equivalent request after a delayed save: $removed.value',
  async ({removed: older, retained: newer}) => {
    const saving = Promise.withResolvers<void>()
    const repository = createLanguageLearningWordAudioRepository()
    const audio = new Blob(['shared audio'])
    writeLanguageLearningWords([older, newer])
    vi.mocked(repository.save).mockReturnValueOnce(saving.promise)
    vi.mocked(repository.get)
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(() => saving.promise.then(() => audio))
    const {state} = renderPronunciation()
    state.request(older)
    await flushPromises()
    expect(repository.save).toHaveBeenCalledOnce()
    const owner = vi.mocked(repository.save).mock.calls[0]?.[2]
    state.request(newer)
    await flushPromises()
    expect(state.isLoading(newer)).toBe(true)

    saving.resolve()
    await flushPromises()

    expect(repository.delete).toHaveBeenCalledExactlyOnceWith(older, owner, {
      preserveSharedAudio: true,
    })
    expect(state.audioUrl(newer)).toBe('blob:pronunciation')
    expect(state.audioUrl(older)).toBeNull()
    expect(state.isLoading(newer)).toBe(false)
    expect(state.error()).toBeNull()
    expect(repository.save).toHaveBeenCalledOnce()
  },
)

it('should delete audio when only a different language retains the same spelling', async () => {
  writeLanguageLearningWords([{...decomposedWord, language: 'en'}])
  const repository = createLanguageLearningWordAudioRepository()
  const {state} = renderPronunciation()

  state.remove(composedWord)
  await flushPromises()

  expect(repository.delete).toHaveBeenCalledExactlyOnceWith(composedWord)
})

it.each(spellings)(
  'should retain a persisted alias when the pending successor owner unmounts: $removed.value',
  async ({removed: older, retained: newer}) => {
    const saving = Promise.withResolvers<void>()
    const repository = createLanguageLearningWordAudioRepository()
    writeLanguageLearningWords([older, newer])
    vi.mocked(repository.save).mockReturnValueOnce(saving.promise)
    vi.mocked(repository.get)
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(() => saving.promise.then(() => new Blob(['shared audio'])))
    const {state, view} = renderPronunciation()
    state.request(older)
    await flushPromises()
    expect(repository.save).toHaveBeenCalledOnce()
    const owner = vi.mocked(repository.save).mock.calls[0]?.[2]
    state.request(newer)
    await flushPromises()
    view.unmount()

    saving.resolve()
    await flushPromises()

    expect(repository.delete).toHaveBeenCalledExactlyOnceWith(older, owner, {
      preserveSharedAudio: true,
    })
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  },
)

it.each(spellings)(
  'should clean up a late save after both persisted aliases are deleted: $removed.value',
  async ({removed: older, retained: newer}) => {
    const saving = Promise.withResolvers<void>()
    const repository = createLanguageLearningWordAudioRepository()
    writeLanguageLearningWords([older, newer])
    vi.mocked(repository.save).mockReturnValueOnce(saving.promise)
    const {state} = renderPronunciation()
    state.request(older)
    await flushPromises()
    expect(repository.save).toHaveBeenCalledOnce()
    const owner = vi.mocked(repository.save).mock.calls[0]?.[2]
    deleteLanguageLearningWord(older.language, older.value)
    state.remove(older)
    deleteLanguageLearningWord(newer.language, newer.value)
    state.remove(newer)

    saving.resolve()
    await flushPromises()

    expect(repository.delete).toHaveBeenNthCalledWith(1, older, undefined, {
      preserveSharedAudio: true,
    })
    expect(repository.delete).toHaveBeenNthCalledWith(2, newer)
    expect(repository.delete).toHaveBeenNthCalledWith(3, older, owner)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(state.error()).toBeNull()
  },
)
