/** @vitest-environment jsdom */

import {cleanup, render, screen, within} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {readonly children: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('src/components/apps-in-toss-prepare', () => ({
  AppsInTossPrepare: (props: {readonly children: JSX.Element}) => (
    <section aria-label="Apps in Toss preparation">{props.children}</section>
  ),
}))
vi.mock('src/components/p-home-page/PHomePage', () => ({PHomePage: () => <p>Pomo home</p>}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.resetModules()
  vi.unstubAllEnvs()
})

it('should render the web home at the root without redirecting', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)

  expect(screen.getByText('Pomo home')).toBeInTheDocument()
  expect(screen.queryByRole('region', {name: 'Apps in Toss preparation'})).not.toBeInTheDocument()
})

it('should render the Pomo home inside Apps in Toss preparation', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)
  const preparation = screen.getByRole('region', {name: 'Apps in Toss preparation'})
  expect(within(preparation).getByText('Pomo home')).toBeInTheDocument()
})
