/** @vitest-environment jsdom */
import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type ScreenWakeLockController, useScreenWakeLock} from '../features/screen-wake-lock'
import {browserWakeLock} from '../features/screen-wake-lock/browser-wake-lock'

vi.mock('../features/screen-wake-lock/browser-wake-lock', () => ({
  browserWakeLock: {
    isSupported: vi.fn(),
    isVisible: vi.fn(),
    request: vi.fn(),
    subscribeVisibility: vi.fn(),
  },
}))

const ScreenWakeLockHarness = (props: {onController: (controller: ScreenWakeLockController) => void}) => {
  props.onController(useScreenWakeLock())
  return null
}

describe('screen wake lock capability race', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
    vi.mocked(browserWakeLock.isSupported).mockReturnValue(true)
    vi.mocked(browserWakeLock.isVisible).mockReturnValue(true)
    vi.mocked(browserWakeLock.subscribeVisibility).mockReturnValue(vi.fn())
    vi.mocked(browserWakeLock.request).mockResolvedValue({
      addEventListener: vi.fn(),
      release: vi.fn().mockResolvedValue(undefined),
      released: false,
    } as unknown as WakeLockSentinel)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('should acquire the wake lock when enabled before capability probing finishes', async () => {
    let controller: ScreenWakeLockController | undefined
    render(() => (
      <ScreenWakeLockHarness
        onController={(next) => {
          controller = next
          if (next.availability() === 'checking') {
            next.onEnabledChange(true)
          }
        }}
      />
    ))

    await waitFor(() => expect(controller?.availability()).toBe('supported'))
    expect(controller?.isEnabled()).toBe(true)
    expect(browserWakeLock.request).toHaveBeenCalledOnce()
  })
})
