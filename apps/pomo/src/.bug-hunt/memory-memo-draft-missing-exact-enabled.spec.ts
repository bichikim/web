/** @vitest-environment jsdom */
import {beforeEach, expect, it} from 'vitest'

import {readMemoryMemoDraft} from '../features/memory-assist/draft-storage'

const legacyDraftWithoutExactEnabled = {
  customDate: '',
  recallMode: 'none' as const,
  reminderDay: 'today' as const,
  reminderTime: '09:00',
  text: '작성 중인 메모',
  version: 1 as const,
}

beforeEach(() => {
  sessionStorage.clear()
})

it('should restore a session draft that omits exactEnabled by defaulting it to false', () => {
  sessionStorage.setItem(
    'pomo:memory-memo:draft:v1',
    JSON.stringify(legacyDraftWithoutExactEnabled),
  )

  expect(readMemoryMemoDraft()).toEqual({
    ...legacyDraftWithoutExactEnabled,
    exactEnabled: false,
    exactReminderAdvanceMinutes: 0,
    exactReminderRepeatEnabled: false,
    exactReminderRepeatIntervalMinutes: 10,
    exactReminderRepeatUntilMinutes: 60,
  })
})
