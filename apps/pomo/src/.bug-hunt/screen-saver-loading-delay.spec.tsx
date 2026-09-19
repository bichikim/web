/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'

import type {ScreenSaverController} from '../features/screen-saver/model'
import {DEFAULT_SCREEN_SAVER_DELAY} from '../features/screen-saver/storage'
import {useScreenSaver} from '../features/screen-saver/use-screen-saver'

const preferenceMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../features/screen-saver/storage', async () => {
  const actual: typeof import('../features/screen-saver/storage') = await vi.importActual(
    '../features/screen-saver/storage',
  )
  return {
    ...actual,
    readScreenSaverDelay: preferenceMocks.read,
    writeScreenSaverDelay: preferenceMocks.write,
  }
})

interface ScreenSaverHarnessProps {
  readonly onController: (controller: ScreenSaverController) => void
}

const ScreenSaverHarness = (props: ScreenSaverHarnessProps) => {
  const controller = useScreenSaver()
  props.onController(controller)
  return null
}

describe('screen-saver loading delay bug hunt', () => {
  beforeEach(() => {
    preferenceMocks.read.mockReset()
    preferenceMocks.write.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should expose the default delay while the stored preference is still loading', async () => {
    let completeRead: (delay: string) => void = () => undefined
    preferenceMocks.read.mockReturnValue(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )

    let controller: ScreenSaverController | undefined
    render(() => (
      <PreferenceProvider>
        <ScreenSaverHarness
          onController={(nextController) => {
            controller = nextController
          }}
        />
      </PreferenceProvider>
    ))

    expect(controller?.delay()).toBe(DEFAULT_SCREEN_SAVER_DELAY)

    completeRead('1m')
    await Promise.resolve()
    expect(controller?.delay()).toBe('1m')
  })

  it('should not treat a loading preference as disabled while the stored value is enabled', async () => {
    vi.useFakeTimers()
    let completeRead: (delay: string) => void = () => undefined
    preferenceMocks.read.mockReturnValue(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )

    let controller: ScreenSaverController | undefined
    render(() => (
      <PreferenceProvider>
        <ScreenSaverHarness
          onController={(nextController) => {
            controller = nextController
          }}
        />
      </PreferenceProvider>
    ))

    vi.advanceTimersByTime(60_000)
    expect(controller?.isActive()).toBe(false)

    completeRead('1m')
    await Promise.resolve()

    vi.advanceTimersByTime(60_000)
    expect(controller?.isActive()).toBe(true)
  })
})
