/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {InstallationMetadata} from '../InstallationMetadata'

afterEach(() => vi.unstubAllEnvs())

it('should link the manifest and Apple icon on the web', () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')
  const {container} = render(() => <InstallationMetadata />)
  expect(container.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe(
    '/manifest.webmanifest',
  )
  expect(container.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe(
    '/icons/apple-touch.png',
  )
})

it.each(['VITE_POMO_IS_APPS_IN_TOSS', 'VITE_POMO_IS_DESKTOP'])(
  'should omit installation metadata for %s',
  (target) => {
    vi.stubEnv(target, 'true')
    const {container} = render(() => <InstallationMetadata />)
    expect(container.querySelector('link')).toBeNull()
  },
)
