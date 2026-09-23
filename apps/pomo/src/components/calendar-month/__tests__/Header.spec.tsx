/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {CalendarHeader} from '../Header'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should forward month offsets and place settings after navigation', () => {
  const onChange = vi.fn()
  render(() => (
    <CalendarHeader
      month={new Date(2026, 8, 1)}
      onChange={onChange}
      settings={<button type="button">설정</button>}
    />
  ))
  expect(screen.getByRole('heading')).toHaveTextContent('2026')
  fireEvent.click(screen.getByRole('button', {name: m.calendar_month_previous()}))
  fireEvent.click(screen.getByRole('button', {name: m.calendar_month_next()}))
  expect(onChange.mock.calls).toEqual([[-1], [1]])
  expect(screen.getByRole('button', {name: '설정'}).previousElementSibling).toBe(
    screen.getByRole('navigation'),
  )
})
