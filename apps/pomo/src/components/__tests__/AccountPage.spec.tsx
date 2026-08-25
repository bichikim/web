/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {readonly children: unknown}) => <>{props.children}</>,
}))
vi.mock('@paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@paraglide/runtime')>()),
  localizeHref: (href: string) => `/ko${href}`,
}))
vi.mock('../user-auth/TossAccount', () => ({TossAccount: () => <p>Toss account</p>}))
vi.mock('../user-auth/WebAccount', () => ({WebAccount: () => <p>Web account</p>}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it.each([
  [false, 'Web account'],
  [true, 'Toss account'],
] as const)('should render the account page for Toss=%s', async (isAppsInToss, accountText) => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', isAppsInToss ? '1' : '')
  const {AccountPage} = await import('../AccountPage')

  render(() => <AccountPage />)

  expect(screen.getByRole('main')).toHaveTextContent('Pomo account')
  expect(screen.getByRole('link')).toHaveAttribute('href', '/ko/')
  expect(screen.getByText(accountText)).toBeInTheDocument()
})
