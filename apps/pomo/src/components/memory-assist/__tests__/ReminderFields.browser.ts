import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {ReminderFields} from '../ReminderFields'
import {createReminderDraft} from '../reminder-draft'

const ADVANCE_MINUTES = 30
const REPEAT_INTERVAL = 20
const REPEAT_DURATION = 90

afterEach(cleanup)

it('should paste fullwidth clock and minute values into exact reminder fields', async () => {
  const [draft, setDraft] = createSignal(
    createReminderDraft({
      exactReminderAt: '2026-02-01T08:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      now: new Date('2026-02-01T00:00:00.000Z'),
      recallMode: 'none',
    }),
  )
  render(() => createComponent(ReminderFields, {draft, onChange: setDraft}))
  const expected = [
    [m.memory_memo_time(), '０９：０５', '09:05'],
    [m.memory_memo_exact_advance(), '３０', ADVANCE_MINUTES],
    [m.memory_memo_exact_repeat_interval(), '２０', REPEAT_INTERVAL],
    [m.memory_memo_exact_repeat_until(), '９０', REPEAT_DURATION],
  ] as const
  await Promise.all(
    expected.map(async ([label, value, normalized]) => {
      const input = page.getByLabelText(label, {exact: true})
      const data = new DataTransfer()
      data.setData('text/plain', value)
      const clipboard = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(clipboard, 'clipboardData', {value: data})
      input.element().dispatchEvent(clipboard)
      await expect.element(input).toHaveValue(normalized)
    }),
  )
  expect(draft()).toMatchObject({
    exactReminderAdvanceMinutes: 30,
    exactReminderRepeatIntervalMinutes: 20,
    exactReminderRepeatUntilMinutes: 90,
    reminderTime: '09:05',
  })
})
