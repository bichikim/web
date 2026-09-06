import {expect, it} from 'vitest'

import {isMemoryMemoOwnedDialogue} from '../dialogue-id'

it.each([
  ['memory-memo-one', true],
  ['memory-memo-one:61f5d718-00b9-4187-a01e-c4a9792d7c31', true],
  ['memory-memo-two:61f5d718-00b9-4187-a01e-c4a9792d7c31', false],
  ['memory-memo-one-other:61f5d718-00b9-4187-a01e-c4a9792d7c31', false],
  ['memory-memo-one:other-memo', false],
])('should recognize exact memo ownership for %s', (dialogueId, owned) => {
  expect(isMemoryMemoOwnedDialogue(dialogueId, 'one')).toBe(owned)
})
