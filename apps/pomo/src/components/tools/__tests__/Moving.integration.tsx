/** @vitest-environment jsdom */
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {Moving} from '../Moving'

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

type SelectPointerEventName = 'pointerdown' | 'pointerup'

const createSelectPointerEvent = (eventName: SelectPointerEventName) => {
  const event = new MouseEvent(eventName, {bubbles: true, button: 0})
  Object.defineProperties(event, {
    pointerId: {value: 1},
    pointerType: {value: 'mouse'},
  })
  return event
}

const dispatchSelectPointerEvent = (target: HTMLElement, eventName: SelectPointerEventName) =>
  fireEvent(target, createSelectPointerEvent(eventName))

const selectOption = async (label: RegExp, value: string) => {
  const trigger = screen.getByRole('button', {name: label})
  dispatchSelectPointerEvent(trigger, 'pointerdown')
  await Promise.resolve()
  dispatchSelectPointerEvent(trigger, 'pointerup')
  await Promise.resolve()

  const listbox = screen.getByRole('listbox', {name: label})
  const option = within(listbox).getByRole('option', {name: value})
  dispatchSelectPointerEvent(option, 'pointerdown')
  await Promise.resolve()
  dispatchSelectPointerEvent(option, 'pointerup')
  await Promise.resolve()
}

it('should restore the chosen month and mark its lunar moving days', async () => {
  localStorage.setItem('pomo:tool-moving:v1', JSON.stringify({month: '2', year: '2026'}))
  render(() => (
    <PreferenceProvider>
      <Moving />
    </PreferenceProvider>
  ))
  const calendar = await screen.findByRole('group', {name: '2026년 2월 손 없는 날 달력'})
  expect(calendar.querySelectorAll('[data-moving]')).toHaveLength(5)
  expect(calendar.querySelector('[aria-label="2026-02-25 손 없는 날"]')).toBeInTheDocument()
  expect(calendar.querySelector('[aria-label="2026-02-26 손 없는 날"]')).toBeInTheDocument()
  expect(screen.getByText('2026-02-25')).toBeVisible()
  expect(screen.getByText('2026-02-26')).toBeVisible()
})

it('should update the month and year through the real selectors', async () => {
  localStorage.setItem('pomo:tool-moving:v1', JSON.stringify({month: '2', year: '2026'}))
  render(() => (
    <PreferenceProvider>
      <Moving />
    </PreferenceProvider>
  ))
  await screen.findByRole('group', {name: '2026년 2월 손 없는 날 달력'})

  await selectOption(/연도/u, '2027')
  expect(await screen.findByRole('group', {name: '2027년 2월 손 없는 날 달력'})).toBeVisible()

  await selectOption(/월/u, '3')
  expect(await screen.findByRole('group', {name: '2027년 3월 손 없는 날 달력'})).toBeVisible()
})

it('should open on the device month near a year boundary', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 11, 31, 23, 30))
  render(() => (
    <PreferenceProvider>
      <Moving />
    </PreferenceProvider>
  ))
  expect(await screen.findByRole('group', {name: '2026년 12월 손 없는 날 달력'})).toBeVisible()
})
