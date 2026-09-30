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
vi.mock('src/components/p-relax-player-page/PRelaxPlayerPage', () => ({
  PRelaxPlayerPage: () => <p>Relax player</p>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.resetModules()
  vi.unstubAllEnvs()
})

it('should render the web home at the root without redirecting', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', undefined)
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)

  expect(screen.getByText('Pomo home')).toBeInTheDocument()
  expect(screen.queryByText('Relax player')).not.toBeInTheDocument()
  expect(screen.queryByRole('region', {name: 'Apps in Toss preparation'})).not.toBeInTheDocument()
})

it.each(['all-in-one', 'unknown'])('should render the Pomo home for layout %s', async (layout) => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', layout)
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)

  expect(screen.getByText('Pomo home')).toBeInTheDocument()
  expect(screen.queryByText('Relax player')).not.toBeInTheDocument()
})

it('should render the relax player layout on the web', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', 'relax-player')
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)

  expect(await screen.findByText('Relax player')).toBeInTheDocument()
  expect(screen.queryByText('Pomo home')).not.toBeInTheDocument()
})

it('should render the Pomo home inside Apps in Toss preparation', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  vi.stubEnv('VITE_APP_LAYOUT', '')
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)
  const preparation = screen.getByRole('region', {name: 'Apps in Toss preparation'})
  expect(within(preparation).getByText('Pomo home')).toBeInTheDocument()
})
