/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {type ReminderDraft} from '../components/memory-assist/ReminderFields'
import {MemoryMemoModal} from '../components/memory-assist/MemoryMemoModal'

const createDraft = (): ReminderDraft => ({
  customDate: '2026-01-31',
  exactEnabled: true,
  exactReminderAdvanceMinutes: 0,
  exactReminderRepeatEnabled: false,
  exactReminderRepeatIntervalMinutes: 10,
  exactReminderRepeatUntilMinutes: 60,
  recallMode: 'none',
  reminderDay: 'custom',
  reminderTime: '09:00',
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 0, 31, 23, 30))
})

afterEach(() => {
  vi.useRealTimers()
})

it('should refresh the custom reminder minimum date after local midnight while the modal stays open', () => {
  const [draft, setDraft] = createSignal(createDraft())
  const [isOpen, setIsOpen] = createSignal(true)

  render(() => (
    <MemoryMemoModal
      canSave
      isOpen={isOpen()}
      message={() => null}
      onOpenChange={setIsOpen}
      onReminderChange={setDraft}
      onSave={async () => undefined}
      onTextInput={() => undefined}
      reminderDraft={draft}
      saveLabel="저장"
      text={() => '메모'}
      title="새 메모"
      triggerElement={() => null}
    />
  ))

  const dateInput = () => screen.getByLabelText('날짜') as HTMLInputElement
  expect(dateInput().min).toBe('2026-01-31')

  vi.setSystemTime(new Date(2026, 1, 1, 0, 15))

  expect(dateInput().min).toBe('2026-02-01')
})
