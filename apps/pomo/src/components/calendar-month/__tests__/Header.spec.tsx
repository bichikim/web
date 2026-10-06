/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {CalendarHeader} from '../Header'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should forward month offsets and place settings after navigation', () => {
  const onChange = vi.fn()
  const view = render(() => (
    <CalendarHeader
      month={new Date(2026, 8, 1)}
      onChange={onChange}
      settings={<button type="button">설정</button>}
    />
  ))
  const heading = view.container.querySelector('h2')
  const navigation = view.container.querySelector('nav[aria-label]')
  const [previousButton, nextButton] = Array.from(navigation?.querySelectorAll('button') ?? [])
  const settingsButton = view.getByText('설정', {exact: true}).closest('button')

  expect(heading?.tagName).toBe('H2')
  expect(heading).toBeVisible()
  expect(heading).not.toHaveAttribute('role')
  expect(heading?.closest('[aria-hidden="true"], [inert]')).toBeNull()
  expect(heading).toHaveTextContent('2026')
  expect(navigation).toBeVisible()
  expect(navigation).not.toHaveAttribute('role')
  expect(navigation?.closest('[aria-hidden="true"], [inert]')).toBeNull()
  expect(navigation).toHaveAttribute('aria-label', m.calendar_month_navigation())
  expect(previousButton).toBeVisible()
  expect(previousButton).not.toHaveAttribute('role')
  expect(previousButton?.closest('[aria-hidden="true"], [inert]')).toBeNull()
  expect(previousButton).toHaveAccessibleName(m.calendar_month_previous())
  expect(nextButton).toBeVisible()
  expect(nextButton).not.toHaveAttribute('role')
  expect(nextButton?.closest('[aria-hidden="true"], [inert]')).toBeNull()
  expect(nextButton).toHaveAccessibleName(m.calendar_month_next())
  expect(settingsButton).toBeVisible()
  expect(settingsButton).not.toHaveAttribute('role')
  expect(settingsButton?.closest('[aria-hidden="true"], [inert]')).toBeNull()
  expect(settingsButton).toHaveAccessibleName('설정')

  fireEvent.click(previousButton!)
  fireEvent.click(nextButton!)
  expect(onChange.mock.calls).toEqual([[-1], [1]])
  expect(settingsButton?.previousElementSibling).toBe(navigation)
})
