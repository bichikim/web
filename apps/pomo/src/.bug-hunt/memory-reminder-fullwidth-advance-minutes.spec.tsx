/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {type ReminderDraft, ReminderFields} from '../components/memory-assist/ReminderFields'

vi.mock('src/components/p-select/PSelect', () => ({
  PSelect: () => null,
}))
vi.mock('src/components/p-switch/PSwitch', () => ({
  PSwitch: () => null,
}))

const createExactDraft = (): ReminderDraft => ({
  customDate: '2026-09-21',
  exactEnabled: true,
  exactReminderAdvanceMinutes: 0,
  exactReminderRepeatEnabled: false,
  exactReminderRepeatIntervalMinutes: 10,
  exactReminderRepeatUntilMinutes: 60,
  recallMode: 'none',
  reminderDay: 'today',
  reminderTime: '09:00',
})

it('should parse fullwidth digits pasted into the exact reminder advance field', () => {
  const [draft, setDraft] = createSignal(createExactDraft())
  render(() => <ReminderFields draft={draft} onChange={setDraft} />)

  const advanceInput = screen.getByLabelText('몇 분 전부터')
  fireEvent.input(advanceInput, {target: {value: '３０', valueAsNumber: Number.NaN}})

  expect(draft().exactReminderAdvanceMinutes).toBe(30)
})
