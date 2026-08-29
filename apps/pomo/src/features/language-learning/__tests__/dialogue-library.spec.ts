import {expect, it} from 'vitest'

import type {PDialogue} from '../../focus-room-dialogue'
import {excludeLanguageLearningDialogues} from '../dialogue-library'
import type {LanguageLearningSentence} from '../schema'

const createDialogue = (id: string, text: string): PDialogue => ({
  audioKey: `audio-${id}`,
  createdAt: '2026-08-29T00:00:00.000Z',
  durationMs: 1000,
  id,
  language: 'en',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text}],
  text,
  updatedAt: '2026-08-29T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

it('should exclude language learning dialogues from a saved dialogue collection', () => {
  const manualDialogue = createDialogue('manual-dialogue', 'A regular dialogue.')
  const learningDialogue = createDialogue('learning-dialogue', 'A learning dialogue.')
  const sentence: LanguageLearningSentence = {
    createdAt: '2026-08-29T00:00:00.000Z',
    dialogueId: learningDialogue.id,
    language: 'en',
    tags: ['learning'],
    text: learningDialogue.text,
    version: 1,
  }

  expect(excludeLanguageLearningDialogues([manualDialogue, learningDialogue], [sentence])).toEqual([
    manualDialogue,
  ])
})
