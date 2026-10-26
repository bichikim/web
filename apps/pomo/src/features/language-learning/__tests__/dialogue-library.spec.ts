/** @vitest-environment node */
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

it('should exclude learning dialogues by ID while retaining order, duplicates, and references', () => {
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

  const otherDialogue = createDialogue('other-dialogue', 'Another dialogue.')
  const dialogues = Object.freeze([
    manualDialogue,
    structuredClone(learningDialogue),
    otherDialogue,
    manualDialogue,
  ])
  const result = excludeLanguageLearningDialogues(dialogues, Object.freeze([sentence, sentence]))

  expect(result).toEqual([manualDialogue, otherDialogue, manualDialogue])
  expect(result[0]).toBe(manualDialogue)
  expect(result[1]).toBe(otherDialogue)
  expect(result[2]).toBe(manualDialogue)
})
