/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {readonly children: unknown}) => <>{props.children}</>,
}))
vi.mock('../PStudio', () => ({PStudio: () => <p>studio ready</p>}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it.each([false, true])('should render the lazy home studio for Toss=%s', async (isAppsInToss) => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', isAppsInToss ? 'true' : '')
  const {PHomePage} = await import('../PHomePage')

  render(() => <PHomePage />)

  expect(await screen.findByText('studio ready')).toBeInTheDocument()
  const main = screen.getByRole('main')
  expect(main.classList.contains('pomo-home')).toBe(true)
  expect(main.className.includes('radial-gradient')).toBe(!isAppsInToss)
})
