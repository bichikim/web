import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'

import type {CalendarEvent} from '../../../features/calendar'
import {localDateRuntime} from '../../../features/civil-date'
import {MEMORY_MEMOS_STORAGE_KEY} from '../../../features/memory-assist/repository'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

const VIEWPORT_WIDTH = 800
const VIEWPORT_HEIGHT = 600
const FINAL_SUBSCRIPTION_COUNT = 3

vi.mock('../../../features/focus-room-dialogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../features/focus-room-dialogue')>()
  return {
    ...actual,
    deleteDialogueAudio: async () => undefined,
    usePEvents: () => ({deleteDialogue: async () => undefined}),
  }
})

const event: CalendarEvent = {
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-02-02',
  id: 'connection-1:event-1',
  provider: 'google',
  start: '2026-02-01',
  title: '팀 회의',
}

let timerCancelCount = 0
let visibilityUnsubscribeCount = 0
let outsideButton: HTMLButtonElement | undefined

beforeEach(async () => {
  await page.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  localStorage.removeItem(MEMORY_MEMOS_STORAGE_KEY)
  timerCancelCount = 0
  visibilityUnsubscribeCount = 0
  outsideButton = document.createElement('button')
  outsideButton.textContent = 'Outside'
  outsideButton.style.position = 'fixed'
  outsideButton.style.right = '0'
  outsideButton.style.bottom = '0'
  document.body.append(outsideButton)
})

afterEach(() => {
  cleanup()
  outsideButton?.remove()
  outsideButton = undefined
  localStorage.removeItem(MEMORY_MEMOS_STORAGE_KEY)
  vi.restoreAllMocks()
})

it('should unmount the live date subscription after native dismissals and a successful save', async () => {
  const {schedule, subscribe} = localDateRuntime
  const scheduleSpy = vi
    .spyOn(localDateRuntime, 'schedule')
    .mockImplementation((callback, delay) => {
      const cancel = schedule(callback, delay)
      return () => {
        timerCancelCount += 1
        cancel()
      }
    })
  const subscribeSpy = vi.spyOn(localDateRuntime, 'subscribe').mockImplementation((callback) => {
    const unsubscribe = subscribe(callback)
    return () => {
      visibilityUnsubscribeCount += 1
      unsubscribe()
    }
  })

  const view = render(() =>
    createComponent(CalendarAlarmControl, {
      event,
      memos: () => [],
      now: () => new Date('2026-01-31T14:59:59.000Z'),
      timeZone: 'Asia/Seoul',
    }),
  )
  const popover = view.container.querySelector<HTMLElement>('[popover]')!
  const nativeToggleStates: string[] = []
  popover.addEventListener('toggle', (toggleEvent) => {
    nativeToggleStates.push((toggleEvent as ToggleEvent).newState)
  })
  const dateInput = page.getByLabelText('날짜')
  const open = async (expectedSubscription: number) => {
    await page.getByRole('button', {name: '팀 회의 알람 설정'}).click()
    await expect.poll(() => dateInput.length).toBe(1)
    await expect.poll(() => nativeToggleStates.at(-1)).toBe('open')
    expect(dateInput.element().getAttribute('min')).toBe('2026-01-31')
    expect(scheduleSpy).toHaveBeenCalledTimes(expectedSubscription)
    expect(subscribeSpy).toHaveBeenCalledTimes(expectedSubscription)
    expect(view.container.querySelector('[popover]')).toBe(popover)
  }
  const expectClosed = async (expectedSubscription: number) => {
    await expect.poll(() => dateInput.length).toBe(0)
    await expect.poll(() => timerCancelCount).toBe(expectedSubscription)
    await expect.poll(() => visibilityUnsubscribeCount).toBe(expectedSubscription)
    await expect.poll(() => nativeToggleStates.at(-1)).toBe('closed')
    expect(view.container.querySelector('[popover]')).toBe(popover)
  }

  await open(1)
  await userEvent.keyboard('{Escape}')
  await expectClosed(1)

  await open(2)
  await page.elementLocator(outsideButton!).click()
  await expectClosed(2)

  await open(FINAL_SUBSCRIPTION_COUNT)
  await page.getByRole('button', {name: '알람 저장'}).click()
  await expectClosed(FINAL_SUBSCRIPTION_COUNT)

  const storedMemos = JSON.parse(localStorage.getItem(MEMORY_MEMOS_STORAGE_KEY) ?? '[]') as Array<{
    exactReminderAt: string
  }>
  expect(storedMemos).toHaveLength(1)
  expect(storedMemos[0]?.exactReminderAt).toBe('2026-02-01T00:00:00.000Z')
})
