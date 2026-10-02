/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

const capture = vi.hoisted(() => ({returnHref: undefined as string | undefined}))
const {searchParams} = vi.hoisted(() => ({searchParams: {layout: '' as string | string[]}}))

vi.mock('@solidjs/router', () => ({useSearchParams: () => [searchParams]}))
vi.mock('src/components/apps-in-toss-prepare', () => ({
  AppsInTossPrepare: (props: {readonly children: unknown}) => <section>{props.children}</section>,
}))
vi.mock('src/components/p-home-page/PHomePage', () => ({PHomePage: () => <p>Pomo home</p>}))
vi.mock('src/components/p-relax-player-page/PRelaxPlayerPage', () => ({
  PRelaxPlayerPage: (props: {readonly returnHref?: string}) => {
    capture.returnHref = props.returnHref
    return <p>Relax player</p>
  },
}))

afterEach(() => {
  searchParams.layout = ''
  capture.returnHref = undefined
  cleanup()
  vi.clearAllMocks()
  vi.resetModules()
  vi.unstubAllEnvs()
})

it('should pass the all-in-one escape href to the relax-player home layout', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_APP_LAYOUT', 'relax-player')
  const {default: RootPage} = await import(
    '../routes/(main-layout)/(home-layout)/index'
  )

  render(() => <RootPage />)
  await screen.findByText('Relax player')

  expect(capture.returnHref).toBe('/?layout=all-in-one')
})
