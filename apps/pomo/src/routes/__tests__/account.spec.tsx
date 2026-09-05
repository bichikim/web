/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import AccountRoute from '../account'

const mocks = vi.hoisted(() => ({search: {} as Record<string, string | string[] | undefined>}))

vi.mock('@solidjs/router', () => ({useSearchParams: () => [mocks.search]}))
vi.mock('../../components/AccountPage', () => ({
  AccountPage: (props: {connectedCalendarProvider?: string}) => (
    <p>{props.connectedCalendarProvider ?? 'account'}</p>
  ),
}))

afterEach(cleanup)

it.each(['google', 'microsoft'])(
  'should show the connected %s provider after authorization',
  (provider) => {
    mocks.search = {calendar: 'connected', provider}
    render(() => <AccountRoute />)
    expect(screen.getByText(provider)).toBeVisible()
  },
)

it.each([
  {},
  {calendar: 'failed', provider: 'google'},
  {calendar: 'connected', provider: 'unknown'},
  {calendar: 'connected', provider: ['google', 'microsoft']},
])('should show the ordinary account page without a valid successful callback: %j', (search) => {
  mocks.search = search
  render(() => <AccountRoute />)
  expect(screen.getByText('account')).toBeVisible()
})
