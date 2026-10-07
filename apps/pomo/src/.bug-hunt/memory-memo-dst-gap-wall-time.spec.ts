import {describe, expect, it} from 'vitest'

import {resolveReminderAt} from '../components/memory-assist/reminder-draft'

const isAmericaNewYork = Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York'

describe('memory memo exact reminders on DST gap days', () => {
  it.skipIf(!isAmericaNewYork)(
    'should reject a nonexistent spring-forward wall time instead of shifting it',
    () => {
      const now = new Date('2026-03-08T04:00:00.000Z')

      expect(resolveReminderAt('custom', '2026-03-08', '02:30', now)).toBeNull()
    },
  )
})
