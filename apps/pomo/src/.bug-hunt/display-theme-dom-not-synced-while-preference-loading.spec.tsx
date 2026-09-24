/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {createEffect} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'

import {DEFAULT_DISPLAY_THEME} from '../features/display-theme/model'
import {useDisplayThemeController} from '../features/display-theme/use-display-theme'

const preferenceMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../features/display-theme/storage', async () => {
  const actual: typeof import('../features/display-theme/storage') = await vi.importActual(
    '../features/display-theme/storage',
  )
  return {
    ...actual,
    readDisplayThemePreference: preferenceMocks.read,
    writeDisplayThemePreference: preferenceMocks.write,
  }
})

beforeEach(() => {
  preferenceMocks.read.mockReset()
  preferenceMocks.write.mockReset()
  document.documentElement.classList.remove('dark')
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.classList.remove('dark')
})

it('should apply the default preference to the document while storage is still loading', async () => {
  preferenceMocks.read.mockImplementation(() => new Promise(() => undefined))

  let preference = DEFAULT_DISPLAY_THEME
  render(() => (
    <PreferenceProvider>
      <DisplayThemeProbe onPreference={(value) => (preference = value)} />
    </PreferenceProvider>
  ))

  await Promise.resolve()

  expect(preference).toBe(DEFAULT_DISPLAY_THEME)
  expect(document.documentElement.classList.contains('dark')).toBe(
    DEFAULT_DISPLAY_THEME === 'dark',
  )
})

const DisplayThemeProbe = (props: {readonly onPreference: (value: string) => void}) => {
  const controller = useDisplayThemeController()
  createEffect(() => props.onPreference(controller.preference()))
  return null
}
