/** @vitest-environment node */
import {expect, it} from 'vitest'

import {advanceMemoryMemo, createMemoryMemo, editMemoryMemo} from '../features/memory-assist/schedule'

const NOW = new Date('2026-09-04T03:00:00.000Z')

it('should recompute nextExactReminderAt when repeat interval changes during an active repeat series', () => {
  const memo = createMemoryMemo({
    exactReminderAt: '2026-09-04T04:00:00.000Z',
    exactReminderRepeatIntervalMinutes: 15,
    exactReminderRepeatUntilMinutes: 120,
    id: 'memo-1',
    now: NOW,
    random: () => 0,
    recallMode: 'none',
    text: '여권 갱신하기',
  })

  const afterFirstFire = advanceMemoryMemo({
    kind: 'exact',
    memo,
    now: new Date('2026-09-04T04:00:00.000Z'),
    random: () => 0,
  })

  expect(afterFirstFire.nextExactReminderAt).toBe('2026-09-04T04:15:00.000Z')

  const edited = editMemoryMemo({
    exactReminderAt: afterFirstFire.exactReminderAt,
    exactReminderRepeatIntervalMinutes: 30,
    exactReminderRepeatUntilMinutes: 120,
    memo: afterFirstFire,
    now: new Date('2026-09-04T04:05:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: afterFirstFire.text,
  })

  expect(edited.exactReminderRepeatIntervalMinutes).toBe(30)
  expect(edited.nextExactReminderAt).toBe('2026-09-04T04:30:00.000Z')
})
