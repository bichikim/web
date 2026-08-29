/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {PDialogueRepository} from '../../../features/focus-room-dialogue'
import {readLanguageLearningSentences} from '../../../features/language-learning'
import type {LanguageLearningCandidate} from '../Review'
import {saveLanguageLearningCandidates} from '../save'

const createCandidate = (id: string): LanguageLearningCandidate => ({
  audio: new Blob([id]),
  audioKey: `audio-${id}`,
  audioUrl: `blob:${id}`,
  durationMs: 1000,
  id,
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: `Sentence ${id}.`}],
  selected: true,
  text: `Sentence ${id}.`,
  voiceId: 'Yuna',
})

const createRepository = () =>
  ({
    deleteDialogue: vi.fn(async () => undefined),
    saveDialogue: vi.fn(async () => undefined),
  }) satisfies Pick<PDialogueRepository, 'deleteDialogue' | 'saveDialogue'>

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('saveLanguageLearningCandidates', () => {
  it('should save dialogue audio and learning records together', async () => {
    const repository = createRepository()

    await saveLanguageLearningCandidates({
      candidates: [createCandidate('one')],
      createdAt: '2026-08-29T00:00:00.000Z',
      language: 'en',
      repository,
      tags: ['home'],
    })

    expect(repository.saveDialogue).toHaveBeenCalledOnce()
    expect(repository.deleteDialogue).not.toHaveBeenCalled()
    expect(readLanguageLearningSentences()).toMatchObject([
      {dialogueId: 'one', language: 'en', tags: ['home'], text: 'Sentence one.'},
    ])
  })

  it('should roll back every saved dialogue and preserve cleanup failures', async () => {
    const repository = createRepository()
    vi.mocked(repository.saveDialogue)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('save failed'))
    vi.mocked(repository.deleteDialogue).mockRejectedValueOnce(new Error('rollback failed'))

    const save = saveLanguageLearningCandidates({
      candidates: [createCandidate('one'), createCandidate('two')],
      createdAt: '2026-08-29T00:00:00.000Z',
      language: 'en',
      repository,
      tags: ['home'],
    })

    await expect(save).rejects.toMatchObject({
      errors: [
        expect.objectContaining({message: 'save failed'}),
        expect.objectContaining({message: 'rollback failed'}),
      ],
    })
    expect(repository.deleteDialogue).toHaveBeenCalledWith('one')
    expect(readLanguageLearningSentences()).toEqual([])
  })
})
