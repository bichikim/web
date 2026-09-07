import {expect, it, vi} from 'vitest'

import type {ModelStorage} from '../../model-storage'
import type {LanguageLearningWord} from '../word-schema'
import {
  createLanguageLearningWordAudioRepository,
  LanguageLearningWordAudioStorageError,
} from '../word-audio-storage'

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

  await repository.save(word, audio, 'request-1')
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

it('should expose a stable storage operation instead of a localized error message', async () => {
  const storage = createStorage()
  const cause = new Error('cache unavailable')
  vi.mocked(storage.set).mockResolvedValueOnce({
    error: {cause, operation: 'write'},
    ok: false,
  })
  const repository = createLanguageLearningWordAudioRepository(storage)

  await expect(repository.save(word, new Blob(['audio']), 'request-1')).rejects.toMatchObject({
    cause,
    name: 'LanguageLearningWordAudioStorageError',
    operation: 'write',
  } satisfies Partial<LanguageLearningWordAudioStorageError>)
})

it('should not let an older request delete audio saved by a newer request', async () => {
  let storedResponse: Response | null = null
  let resolveFirstWrite: (() => void) | undefined
  let writeCount = 0
  const storage: ModelStorage = {
    delete: vi.fn(async () => {
      storedResponse = null
      return {ok: true as const, value: true}
    }),
    get: vi.fn(async () => ({ok: true as const, value: storedResponse?.clone() ?? null})),
    set: vi.fn(async (_key, response) => {
      writeCount += 1
      if (writeCount === 1) {
        await new Promise<void>((resolve) => {
          resolveFirstWrite = resolve
        })
      }
      storedResponse = response.clone()
      return {ok: true as const, value: undefined}
    }),
  }
  const repository = createLanguageLearningWordAudioRepository(storage)

  const olderSave = repository.save(word, new Blob(['old']), 'request-1')
  const removal = repository.delete(word)
  const newerSave = repository.save(word, new Blob(['newer audio']), 'request-2')
  await vi.waitFor(() => expect(resolveFirstWrite).toBeTypeOf('function'))
  resolveFirstWrite?.()
  await Promise.all([olderSave, removal, newerSave])
  await repository.delete(word, 'request-1')

  const storedResult = await storage.get('unused')
  expect(storedResult.ok).toBe(true)
  if (!storedResult.ok) {
    throw new Error('Expected stored audio')
  }
  expect(storedResult.value?.headers.get('X-Pomo-Word-Audio-Owner')).toBe('request-2')
})

it('should order writes across repository instances sharing the audio cache', async () => {
  let storedResponse: Response | null = null
  let resolveFirstWrite: (() => void) | undefined
  let writeCount = 0
  const storage: ModelStorage = {
    delete: vi.fn(async () => {
      storedResponse = null
      return {ok: true as const, value: true}
    }),
    get: vi.fn(async () => ({ok: true as const, value: storedResponse?.clone() ?? null})),
    set: vi.fn(async (_key, response) => {
      writeCount += 1
      if (writeCount === 1) {
        await new Promise<void>((resolve) => {
          resolveFirstWrite = resolve
        })
      }
      storedResponse = response.clone()
      return {ok: true as const, value: undefined}
    }),
  }
  const olderRepository = createLanguageLearningWordAudioRepository(storage)
  const newerRepository = createLanguageLearningWordAudioRepository(storage)

  const olderSave = olderRepository.save(word, new Blob(['old']), 'request-1')
  const newerSave = newerRepository.save(word, new Blob(['newer audio']), 'request-2')
  await vi.waitFor(() => expect(resolveFirstWrite).toBeTypeOf('function'))
  resolveFirstWrite?.()
  await Promise.all([olderSave, newerSave])
  await olderRepository.delete(word, 'request-1')

  const storedResult = await storage.get('unused')
  expect(storedResult.ok).toBe(true)
  if (!storedResult.ok) {
    throw new Error('Expected stored audio')
  }
  expect(storedResult.value?.headers.get('X-Pomo-Word-Audio-Owner')).toBe('request-2')
})
