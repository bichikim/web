/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {readonly children: unknown}) => <>{props.children}</>,
}))
vi.mock('../user-auth/TossAccount', () => ({TossAccount: () => <p>Toss account</p>}))
vi.mock('../user-auth/WebAccount', () => ({WebAccount: () => <p>Web account</p>}))

beforeEach(() => cleanup())

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it.each([
  [false, 'Web account'],
  [true, 'Toss account'],
] as const)(
  'should render the account page for Toss=%s',
  async (isAppsInToss, accountText) => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', isAppsInToss ? 'true' : '')
    const {AccountPage} = await import('../AccountPage')

    render(() => <AccountPage />)

    expect(screen.getByRole('main')).toHaveTextContent('Pomo account')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/')
    expect(screen.getByText(accountText)).toBeInTheDocument()
  },
  15_000,
)
