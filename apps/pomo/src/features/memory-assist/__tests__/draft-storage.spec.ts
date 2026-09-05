/** @vitest-environment jsdom */

import {beforeEach, expect, it} from 'vitest'

import {deleteMemoryMemoDraft, readMemoryMemoDraft, writeMemoryMemoDraft} from '../draft-storage'

const draft = {
  customDate: '2026-09-06',
  exactEnabled: true,
  exactReminderAdvanceMinutes: 30,
  exactReminderRepeatEnabled: true,
  exactReminderRepeatIntervalMinutes: 10,
  exactReminderRepeatUntilMinutes: 60,
  recallMode: 'none' as const,
  reminderDay: 'custom' as const,
  reminderTime: '14:30',
  text: '여권 갱신하기',
  version: 1 as const,
}

beforeEach(() => {
  sessionStorage.clear()
})

it('should persist and restore the unsaved memo draft for the browser session', () => {
  writeMemoryMemoDraft(draft)

  expect(readMemoryMemoDraft()).toEqual(draft)
})

it('should ignore malformed stored drafts', () => {
  sessionStorage.setItem('pomo:memory-memo:draft:v1', '{"version":1,"text":3}')

  expect(readMemoryMemoDraft()).toBeNull()
})

it('should disable ongoing recall in a stored exact reminder draft', () => {
  writeMemoryMemoDraft({...draft, recallMode: 'reinforcement'})

  expect(readMemoryMemoDraft()?.recallMode).toBe('none')
})

it('should remove the draft after the memo is saved', () => {
  writeMemoryMemoDraft(draft)
  deleteMemoryMemoDraft()

  expect(readMemoryMemoDraft()).toBeNull()
})
