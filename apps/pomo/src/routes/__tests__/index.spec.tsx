/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {type Component, type JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

let clientLoader: (() => Promise<{default: Component}>) | undefined

vi.mock('@solidjs/meta', () => ({
  Title: (props: {readonly children: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/start', () => ({
  clientOnly: (loader: () => Promise<{default: Component}>, _options: {readonly lazy: boolean}) => {
    clientLoader = loader
    return (props: {readonly fallback: JSX.Element}) => <>{props.fallback}</>
  },
}))
vi.mock('../../components/AppsInTossHomePage', () => ({
  AppsInTossHomePage: () => <p>Apps in Toss home</p>,
}))
vi.mock('../../components/AppsInTossLoadingPage', () => ({
  AppsInTossLoadingPage: () => <p>Apps in Toss loading</p>,
}))
vi.mock('../../components/PHomePage', () => ({PHomePage: () => <p>web home</p>}))

afterEach(() => {
  cleanup()
  clientLoader = undefined
  vi.clearAllMocks()
  vi.resetModules()
  vi.unstubAllEnvs()
})

it('should render the web home at the root without redirecting', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)

  expect(screen.getByText('web home')).toBeInTheDocument()
})

it('should render and lazy-load the Apps in Toss home', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  const {default: RootPage} = await import('../index')

  render(() => <RootPage />)
  expect(screen.getByText('Apps in Toss loading')).toBeInTheDocument()
  const loaded = await clientLoader?.()
  expect(loaded?.default).toEqual(expect.any(Function))
})
