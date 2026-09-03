import {expect, it, vi} from 'vitest'

import type {ModelStorage} from '../../model-storage'
import type {LanguageLearningWord} from '../word-schema'
import {createLanguageLearningWordAudioRepository} from '../word-audio-storage'

const word: LanguageLearningWord = {
  createdAt: '2026-09-03T00:00:00.000Z',
  language: 'en',
  memorized: false,
  value: 'Home & hearth',
  version: 1,
}

const createStorage = (): ModelStorage => ({
  delete: vi.fn(async () => ({ok: true as const, value: true})),
  get: vi.fn(async () => ({ok: true as const, value: null})),
  set: vi.fn(async () => ({ok: true as const, value: undefined})),
})

it('should store and read compressed word audio without a WAV entry', async () => {
  const storage = createStorage()
  const repository = createLanguageLearningWordAudioRepository(storage)
  const audio = new Blob(['opus'], {type: 'audio/ogg; codecs=opus'})

  await repository.save(word, audio)
  expect(storage.set).toHaveBeenCalledWith(
    expect.stringMatching(/\.opus$/u),
    expect.objectContaining({}),
  )
  expect(storage.set).not.toHaveBeenCalledWith(expect.stringMatching(/\.wav$/u), expect.anything())

  vi.mocked(storage.get).mockResolvedValueOnce({
    ok: true,
    value: new Response(audio),
  })
  await expect(repository.get(word)).resolves.toEqual(audio)
})

it('should delete the saved word audio entry', async () => {
  const storage = createStorage()
  const repository = createLanguageLearningWordAudioRepository(storage)

  await repository.delete(word)

  expect(storage.delete).toHaveBeenCalledWith(expect.stringMatching(/\.opus$/u))
})
