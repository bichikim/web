import {expect, it} from 'vitest'

import type {PDialogue} from '../../focus-room-dialogue'
import {excludeMemoryMemoDialogues} from '../dialogue-library'

const createDialogue = (id: string): PDialogue => ({
  audioKey: id,
  createdAt: '2026-09-04T03:00:00.000Z',
  durationMs: 1000,
  id,
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: id}],
  text: id,
  updatedAt: '2026-09-04T03:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

it('should exclude memo-owned dialogues from the editable dialogue library', () => {
  const manualDialogue = createDialogue('manual-dialogue')
  const memoryDialogue = createDialogue('memory-memo-memo-1')

  expect(excludeMemoryMemoDialogues([manualDialogue, memoryDialogue])).toEqual([manualDialogue])
})
