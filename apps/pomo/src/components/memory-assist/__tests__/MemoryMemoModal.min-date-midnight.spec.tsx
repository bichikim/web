/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {localDateRuntime} from '../../../features/civil-date'
import {MemoryMemoModal} from '../MemoryMemoModal'
import {type ReminderDraft} from '../ReminderFields'

const scheduleUsingTimers = localDateRuntime.schedule
let schedule = vi.spyOn(localDateRuntime, 'schedule')

const createDraft = (customDate: string): ReminderDraft => ({
  customDate,
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
  schedule = vi.spyOn(localDateRuntime, 'schedule')
  schedule.mockReset()
  vi.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']})
  schedule.mockImplementation((callback, delay) => {
    const cancel = scheduleUsingTimers(callback, delay)
    return vi.fn(cancel)
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it.each([
  {
    date: new Date(2026, 0, 31, 23, 59, 59),
    minimumDate: '2026-01-31',
    nextMinimumDate: '2026-02-01',
  },
  {
    date: new Date(2026, 11, 31, 23, 59, 59),
    minimumDate: '2026-12-31',
    nextMinimumDate: '2027-01-01',
  },
])(
  'should refresh the custom reminder minimum at local midnight from $minimumDate',
  async ({date, minimumDate, nextMinimumDate}) => {
    vi.setSystemTime(date)
    const [draft, setDraft] = createSignal(createDraft(minimumDate))
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
    expect(dateInput().min).toBe(minimumDate)
    expect(schedule).toHaveBeenCalledOnce()
    const cancelMidnightTimer = schedule.mock.results[0]?.value as () => void

    await vi.advanceTimersByTimeAsync(999)
    expect(dateInput().min).toBe(minimumDate)
    expect(schedule).toHaveBeenCalledOnce()
    expect(cancelMidnightTimer).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(dateInput().min).toBe(nextMinimumDate)
    expect(schedule).toHaveBeenCalledTimes(2)
    expect(cancelMidnightTimer).toHaveBeenCalledOnce()
  },
)

it('should refresh on visible return and dispose work when closed or unmounted', async () => {
  vi.setSystemTime(new Date(2026, 0, 31, 23, 59, 59))
  const [draft, setDraft] = createSignal(createDraft('2026-01-31'))
  const [isOpen, setIsOpen] = createSignal(true)
  const remove = vi.spyOn(document, 'removeEventListener')
  const documentHidden = vi.spyOn(document, 'hidden', 'get')
  const {unmount} = render(() => (
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
  expect(schedule).toHaveBeenCalledOnce()
  const cancelMidnightTimer = schedule.mock.results[0]?.value as () => void

  documentHidden.mockReturnValue(true)
  vi.setSystemTime(new Date(2026, 1, 1, 0, 15))
  fireEvent(document, new Event('visibilitychange'))
  expect(dateInput().min).toBe('2026-01-31')
  documentHidden.mockReturnValue(false)
  fireEvent(document, new Event('visibilitychange'))
  expect(dateInput().min).toBe('2026-02-01')
  expect(schedule).toHaveBeenCalledTimes(2)
  expect(cancelMidnightTimer).toHaveBeenCalledOnce()
  const cancelVisibleReturnTimer = schedule.mock.results[1]?.value as () => void

  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  expect(isOpen()).toBe(false)
  expect(cancelVisibleReturnTimer).toHaveBeenCalledOnce()

  vi.setSystemTime(new Date(2026, 2, 1, 0, 15))
  fireEvent(document, new Event('visibilitychange'))
  expect(schedule).toHaveBeenCalledTimes(2)
  setIsOpen(true)
  expect(dateInput().min).toBe('2026-03-01')
  expect(schedule).toHaveBeenCalledTimes(3)
  const cancelClosedTimer = schedule.mock.results[2]?.value as () => void

  unmount()
  expect(cancelClosedTimer).toHaveBeenCalledOnce()
  expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  await vi.advanceTimersByTimeAsync(2 * 24 * 60 * 60 * 1000)
  expect(schedule).toHaveBeenCalledTimes(3)
})
