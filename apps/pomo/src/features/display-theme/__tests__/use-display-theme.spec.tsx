/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createEffect} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {DisplayThemeController} from '../model'
import {useDisplayThemeController} from '../use-display-theme'

const preferenceMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../storage', () => ({
  readDisplayThemePreference: preferenceMocks.read,
  writeDisplayThemePreference: preferenceMocks.write,
}))

interface HarnessProps {
  readonly onController: (controller: DisplayThemeController) => void
  readonly onPreferenceChange: (preference: string) => void
}

const Harness = (props: HarnessProps) => {
  const controller = useDisplayThemeController()
  props.onController(controller)
  createEffect(() => props.onPreferenceChange(controller.preference()))
  return null
}

let prefersDark = false
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null

beforeEach(() => {
  prefersDark = false
  mediaListener = null
  preferenceMocks.read.mockReset().mockResolvedValue('system')
  preferenceMocks.write.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: vi.fn((_name: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaListener = listener
      }),
      get matches() {
        return prefersDark
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  )
  document.documentElement.classList.add('dark')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should restore the preference and apply explicit color schemes', async () => {
  preferenceMocks.read.mockResolvedValue('bright')
  let controller: DisplayThemeController | undefined

  render(() => (
    <Harness
      onController={(nextController) => {
        controller = nextController
      }}
      onPreferenceChange={() => undefined}
    />
  ))
  await vi.waitFor(() => expect(controller?.preference()).toBe('bright'))

  expect(document.documentElement.classList.contains('dark')).toBe(false)

  controller?.onPreferenceChange('dark')

  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(preferenceMocks.write).toHaveBeenCalledWith('dark')
})

it('should follow later operating-system changes only in system mode', async () => {
  let controller: DisplayThemeController | undefined
  render(() => (
    <Harness
      onController={(nextController) => {
        controller = nextController
      }}
      onPreferenceChange={() => undefined}
    />
  ))
  await Promise.resolve()

  prefersDark = true
  mediaListener?.({matches: true} as MediaQueryListEvent)
  expect(document.documentElement.classList.contains('dark')).toBe(true)

  controller?.onPreferenceChange('bright')
  mediaListener?.({matches: true} as MediaQueryListEvent)
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})

it('should preserve the bootstrapped color scheme until the saved preference is restored', () => {
  preferenceMocks.read.mockReturnValue(
    new Promise(() => {
      // Keep restoration pending while the bootstrapped document state is asserted.
    }),
  )

  render(() => <Harness onController={() => undefined} onPreferenceChange={() => undefined} />)

  expect(document.documentElement.classList.contains('dark')).toBe(true)
})

it('should not overwrite a newer session choice with a delayed stored preference', async () => {
  let completeRead: (preference: 'dark') => void = () => undefined
  preferenceMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  let controller: DisplayThemeController | undefined
  render(() => (
    <Harness
      onController={(nextController) => {
        controller = nextController
      }}
      onPreferenceChange={() => undefined}
    />
  ))

  controller?.onPreferenceChange('bright')
  completeRead('dark')
  await Promise.resolve()

  expect(controller?.preference()).toBe('bright')
})
