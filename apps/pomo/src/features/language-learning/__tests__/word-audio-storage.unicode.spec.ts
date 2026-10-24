/** @vitest-environment node */

import {expect, it, vi} from 'vitest'
import type {ModelStorage} from '../../model-storage'
import type {LanguageLearningWord} from '../word-schema'
import {createLanguageLearningWordAudioRepository} from '../word-audio-storage'

const composedWord: LanguageLearningWord = {
  createdAt: '2026-09-03T00:00:00.000Z',
  language: 'ko',
  memorized: false,
  value: '한글',
  version: 1,
}
const decomposedWord = {...composedWord, value: composedWord.value.normalize('NFD')}

it.each([
  {newerWord: decomposedWord, olderWord: composedWord},
  {newerWord: composedWord, olderWord: decomposedWord},
])(
  'should retain the newer Unicode-equivalent audio owner: $olderWord.value',
  async ({olderWord, newerWord}) => {
    const entries = new Map<string, Response>()
    const firstWrite = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    const storage: ModelStorage = {
      delete: vi.fn<ModelStorage['delete']>(async (key) => ({
        ok: true,
        value: entries.delete(key),
      })),
      get: vi.fn<ModelStorage['get']>(async (key) => ({
        ok: true,
        value: entries.get(key)?.clone() ?? null,
      })),
      set: vi.fn<ModelStorage['set']>(async (key, response) => {
        if (response.headers.get('X-Pomo-Word-Audio-Owner') === 'older') {
          started.resolve()
          await firstWrite.promise
        }
        entries.set(key, response.clone())
        return {ok: true, value: undefined}
      }),
    }
    const olderRepository = createLanguageLearningWordAudioRepository(storage)
    const newerRepository = createLanguageLearningWordAudioRepository(storage)
    const olderSave = olderRepository.save(olderWord, new Blob(['old']), 'older')
    await started.promise
    const newerSave = newerRepository.save(newerWord, new Blob(['newer pronunciation']), 'newer')
    firstWrite.resolve()
    await Promise.all([olderSave, newerSave])

    await olderRepository.delete(olderWord, 'older')

    expect(entries.size).toBe(1)
    const audio = await newerRepository.get(newerWord)
    expect(await audio?.text()).toBe('newer pronunciation')
    expect([...entries.values()][0]?.headers.get('X-Pomo-Word-Audio-Owner')).toBe('newer')
  },
)

it.each([composedWord, decomposedWord])(
  'should remove only an unshared legacy path before the final shared audio: $value',
  async (removedWord) => {
    const canonicalPath = `/__pomo/language-learning-word-audio/ko/${encodeURIComponent(composedWord.value)}.opus`
    const legacyPath = `/__pomo/language-learning-word-audio/ko/${encodeURIComponent(decomposedWord.value)}.opus`
    const entries = new Map([
      [canonicalPath, new Response('new', {headers: {'X-Pomo-Word-Audio-Owner': 'newer'}})],
      [legacyPath, new Response('old', {headers: {'X-Pomo-Word-Audio-Owner': 'older'}})],
    ])
    const storage: ModelStorage = {
      delete: vi.fn<ModelStorage['delete']>(async (key) => ({
        ok: true,
        value: entries.delete(key),
      })),
      get: vi.fn<ModelStorage['get']>(async (key) => ({
        ok: true,
        value: entries.get(key)?.clone() ?? null,
      })),
      set: vi.fn<ModelStorage['set']>(async (key, response) => {
        entries.set(key, response.clone())
        return {ok: true, value: undefined}
      }),
    }
    const repository = createLanguageLearningWordAudioRepository(storage)

    await repository.delete(removedWord, undefined, {preserveSharedAudio: true})
    await repository.delete(decomposedWord, 'older')

    expect(entries.has(canonicalPath)).toBe(true)
    expect(entries.has(legacyPath)).toBe(false)
    expect(entries.get(canonicalPath)?.headers.get('X-Pomo-Word-Audio-Owner')).toBe('newer')
    const retainedWord = removedWord === composedWord ? decomposedWord : composedWord
    await repository.delete(retainedWord)
    expect(entries.size).toBe(0)
  },
)
