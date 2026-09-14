/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {ViewportMetadata} from '../ViewportMetadata'

afterEach(() => vi.unstubAllEnvs())

it.each([
  {
    appsInToss: '',
    content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    desktop: '',
    target: 'web',
  },
  {
    appsInToss: 'true',
    content:
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    desktop: '',
    target: 'Apps in Toss',
  },
  {
    appsInToss: '',
    content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    desktop: 'true',
    target: 'desktop',
  },
])('should render the viewport metadata for $target', (scenario) => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', scenario.appsInToss)
  vi.stubEnv('VITE_POMO_IS_DESKTOP', scenario.desktop)

  const {container} = render(() => <ViewportMetadata />)
  const metadata = container.querySelectorAll('meta[name="viewport"]')

  expect(metadata).toHaveLength(1)
  expect(metadata[0]).toHaveAttribute('content', scenario.content)
})
