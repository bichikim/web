/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

const {searchParams} = vi.hoisted(() => ({searchParams: {layout: '' as string | string[]}}))

vi.mock('@solidjs/router', () => ({useSearchParams: () => [searchParams]}))
vi.mock('src/components/apps-in-toss-prepare', () => ({
  AppsInTossPrepare: (props: {readonly children: unknown}) => <section>{props.children}</section>,
}))
vi.mock('src/components/p-home-page/PHomePage', () => ({PHomePage: () => <p>Pomo home</p>}))
vi.mock('src/components/p-relax-player-page/PRelaxPlayerPage', () => ({
  PRelaxPlayerPage: () => <p>Relax player</p>,
}))

afterEach(() => {
  searchParams.layout = ''
  cleanup()
  vi.clearAllMocks()
  vi.resetModules()
  vi.unstubAllEnvs()
})

it('should render the Pomo home when layout is an all-in-one search-param array', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', 'relax-player')
  searchParams.layout = ['all-in-one']
  const {default: RootPage} = await import(
    '../routes/(main-layout)/(home-layout)/index'
  )

  render(() => <RootPage />)

  expect(await screen.findByText('Pomo home')).toBeInTheDocument()
  expect(screen.queryByText('Relax player')).not.toBeInTheDocument()
})
