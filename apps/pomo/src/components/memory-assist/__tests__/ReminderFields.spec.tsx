/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {PSwitch} from '../../p-switch/PSwitch'
import {type ReminderDraft, ReminderFields} from '../ReminderFields'

vi.mock('../../p-select/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('../../p-switch/PSwitch', () => ({PSwitch: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const createDraft = (recallMode: ReminderDraft['recallMode']): ReminderDraft => ({
  customDate: '2026-09-21',
  exactEnabled: false,
  exactReminderAdvanceMinutes: 0,
  exactReminderRepeatEnabled: false,
  exactReminderRepeatIntervalMinutes: 10,
  exactReminderRepeatUntilMinutes: 60,
  recallMode,
  reminderDay: 'today',
  reminderTime: '09:00',
})

const getExactSwitchProps = () => {
  const props = vi.mocked(PSwitch).mock.calls[0]?.[0]

  if (props === undefined) {
    throw new TypeError('Expected ReminderFields to render the exact reminder switch')
  }

  return props
}

it.each(['random', 'reinforcement'] as const)(
  'should restore the %s recall mode after an exact reminder is disabled',
  (recallMode) => {
    const [draft, setDraft] = createSignal(createDraft(recallMode))
    render(() => <ReminderFields draft={draft} onChange={setDraft} />)

    const exactSwitchProps = getExactSwitchProps()
    exactSwitchProps.onChange(true)
    expect(draft()).toMatchObject({exactEnabled: true, recallMode})

    exactSwitchProps.onChange(false)
    expect(draft()).toMatchObject({exactEnabled: false, recallMode})
  },
)
