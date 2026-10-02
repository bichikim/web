/** @vitest-environment jsdom */

import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {type Component, type JSX, lazy} from 'solid-js'
import {clientOnly} from '@solidjs/start'
import {afterEach, beforeAll, expect, it, vi} from 'vitest'

interface RelaxPlayerPageProps {
  readonly returnHref?: string
}

const {searchParams} = vi.hoisted(() => ({searchParams: {layout: ''}}))
const {mockRelaxPlayerPage} = vi.hoisted(() => ({
  mockRelaxPlayerPage: vi.fn<(props: RelaxPlayerPageProps) => string>(),
}))
vi.mock('@solidjs/router', () => ({useSearchParams: () => [searchParams]}))
vi.mock('@solidjs/start', () => ({clientOnly: vi.fn()}))

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
  PRelaxPlayerPage: mockRelaxPlayerPage,
}))

mockRelaxPlayerPage.mockImplementation(() => 'Relax player')

let RootPage: Component

beforeAll(async () => {
  vi.mocked(clientOnly).mockImplementation((loader) => lazy(loader))
  RootPage = (await import('../index')).default
})

afterEach(() => {
  searchParams.layout = ''
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

it('should render the web home at the root without redirecting', () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', undefined)

  render(() => <RootPage />)

  expect(screen.getByText('Pomo home')).toBeInTheDocument()
  expect(screen.queryByText('Relax player')).not.toBeInTheDocument()
  expect(screen.queryByRole('region', {name: 'Apps in Toss preparation'})).not.toBeInTheDocument()
})

it.each(['all-in-one', 'unknown'])('should render the Pomo home for layout %s', (layout) => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', layout)

  render(() => <RootPage />)

  expect(screen.getByText('Pomo home')).toBeInTheDocument()
  expect(screen.queryByText('Relax player')).not.toBeInTheDocument()
})

it('should render the relax player layout with an all-in-one escape href', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', 'relax-player')

  render(() => <RootPage />)

  expect(await screen.findByText('Relax player')).toBeInTheDocument()
  expect(mockRelaxPlayerPage.mock.calls[0]?.[0].returnHref).toBe('/?layout=all-in-one')
  expect(screen.queryByText('Pomo home')).not.toBeInTheDocument()
})

it('should render the Pomo home inside Apps in Toss preparation', () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  vi.stubEnv('VITE_APP_LAYOUT', '')

  render(() => <RootPage />)
  const preparation = screen.getByRole('region', {name: 'Apps in Toss preparation'})
  expect(within(preparation).getByText('Pomo home')).toBeInTheDocument()
})

it('should open the all-in-one app from a relax-player build when explicitly requested', () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', 'relax-player')
  searchParams.layout = 'all-in-one'

  render(() => <RootPage />)

  expect(screen.getByText('Pomo home')).toBeInTheDocument()
  expect(screen.queryByText('Relax player')).not.toBeInTheDocument()
})

it('should keep a standalone release on the relax player and link to the full Pomo site', async () => {
  vi.stubEnv('VITE_POMO_STANDALONE_RELAX', 'true')
  searchParams.layout = 'all-in-one'

  render(() => <RootPage />)

  expect(await screen.findByText('Relax player')).toBeInTheDocument()
  expect(mockRelaxPlayerPage.mock.calls[0]?.[0].returnHref).toBe(
    'https://www.pomofi.io/?layout=all-in-one',
  )
  expect(screen.queryByText('Pomo home')).not.toBeInTheDocument()
})
