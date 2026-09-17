/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {Moving} from '../Moving'

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})
it('should restore the chosen month and mark its lunar moving days', async () => {
  localStorage.setItem('pomo:tool-moving:v1', JSON.stringify({month: '2', year: '2026'}))
  render(() => <Moving />)
  const calendar = await screen.findByRole('group', {name: '2026년 2월 손 없는 날 달력'})
  expect(calendar.querySelectorAll('[data-moving]')).toHaveLength(5)
  expect(calendar.querySelector('[aria-label="2026-02-25 손 없는 날"]')).toBeInTheDocument()
  expect(calendar.querySelector('[aria-label="2026-02-26 손 없는 날"]')).toBeInTheDocument()
  expect(screen.getByText('2026-02-25')).toBeVisible()
  expect(screen.getByText('2026-02-26')).toBeVisible()
})

it('should open on the device month near a year boundary', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 11, 31, 23, 30))
  render(() => <Moving />)
  expect(await screen.findByRole('group', {name: '2026년 12월 손 없는 날 달력'})).toBeVisible()
})
