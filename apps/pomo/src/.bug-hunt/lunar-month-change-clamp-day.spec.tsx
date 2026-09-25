/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {Lunar} from '../components/tools/Lunar'

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

it('should clamp lunar day when the month has fewer than 30 days', async () => {
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"lunar"')
  render(() => (
    <PreferenceProvider>
      <Lunar />
    </PreferenceProvider>
  ))

  await waitFor(() => expect(screen.getByText('2026-02-17')).toBeVisible())

  const dayTrigger = screen.getByRole('button', {name: '음력 일 1'})
  dayTrigger.focus()
  fireEvent.keyDown(dayTrigger, {key: 'ArrowDown'})
  fireEvent.keyDown(screen.getByRole('option', {name: '30'}), {key: 'Enter'})

  await waitFor(() => expect(screen.getByText('2026-03-18')).toBeVisible())

  const monthTrigger = screen.getByRole('button', {name: '음력 월 1'})
  fireEvent.click(monthTrigger)
  const monthLayer = document.querySelector('[data-kb-top-layer]')
  expect(monthLayer).not.toBeNull()
  fireEvent.click(within(monthLayer as HTMLElement).getByRole('option', {name: '2'}))

  await waitFor(() => expect(screen.getByRole('button', {name: '음력 월 2'})).toBeVisible())
  expect(screen.getByRole('button', {name: '음력 일 30'})).toBeVisible()
  expect(
    screen.queryByText('존재하지 않는 날짜·윤달이거나 지원 범위를 벗어났습니다.'),
  ).not.toBeInTheDocument()
})
