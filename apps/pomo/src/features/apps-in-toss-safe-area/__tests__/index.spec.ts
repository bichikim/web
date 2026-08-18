/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {useAppsInTossSafeArea} from '..'

const safeAreaMocks = vi.hoisted(() => ({
  get: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  SafeAreaInsets: safeAreaMocks,
}))

const SafeAreaHarness = () => {
  useAppsInTossSafeArea()

  return null
}

describe('useAppsInTossSafeArea', () => {
  beforeEach(() => {
    vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
    safeAreaMocks.get.mockReset().mockReturnValue({bottom: 34, left: 0, right: 0, top: 47})
    safeAreaMocks.subscribe.mockReset().mockReturnValue(vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    document.documentElement.removeAttribute('style')
  })

  it('should apply initial native insets and update them when the WebView changes', async () => {
    render(SafeAreaHarness)

    await vi.waitFor(() => expect(safeAreaMocks.subscribe).toHaveBeenCalledOnce())
    expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-top')).toBe(
      '47px',
    )
    expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-bottom')).toBe(
      '34px',
    )

    const [{onEvent}] = safeAreaMocks.subscribe.mock.calls[0] as [
      {onEvent: (insets: {bottom: number; left: number; right: number; top: number}) => void},
    ]
    onEvent({bottom: 21, left: 8, right: 9, top: 10})

    expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-top')).toBe(
      '10px',
    )
    expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-right')).toBe(
      '9px',
    )
  })

  it('should dispose the native subscription when the app root unmounts', async () => {
    const disposeSubscription = vi.fn()
    safeAreaMocks.subscribe.mockReturnValue(disposeSubscription)
    const view = render(SafeAreaHarness)
    await vi.waitFor(() => expect(safeAreaMocks.subscribe).toHaveBeenCalledOnce())

    view.unmount()

    expect(disposeSubscription).toHaveBeenCalledOnce()
  })

  it('should not load native safe-area values in a regular web build', async () => {
    vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')

    render(SafeAreaHarness)
    await Promise.resolve()

    expect(safeAreaMocks.get).not.toHaveBeenCalled()
    expect(safeAreaMocks.subscribe).not.toHaveBeenCalled()
  })
})
