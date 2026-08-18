/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type ScreenWakeLockController, useScreenWakeLock} from '..'

const appsInTossMocks = vi.hoisted(() => ({
  setScreenAwakeMode: vi.fn(),
}))

vi.mock('@apps-in-toss/web-framework', () => appsInTossMocks)

interface ScreenWakeLockHarnessProps {
  readonly onController: (controller: ScreenWakeLockController) => void
}

const ScreenWakeLockHarness = (props: ScreenWakeLockHarnessProps) => {
  props.onController(useScreenWakeLock())

  return null
}

describe('useScreenWakeLock', () => {
  beforeEach(() => {
    vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
    appsInTossMocks.setScreenAwakeMode
      .mockReset()
      .mockImplementation(({enabled}) => Promise.resolve({enabled}))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('should use the native awake mode and restore it when the owner unmounts', async () => {
    let controller: ScreenWakeLockController | undefined
    const view = render(() => (
      <ScreenWakeLockHarness
        onController={(nextController) => {
          controller = nextController
        }}
      />
    ))

    await waitFor(() => expect(controller?.availability()).toBe('supported'))
    controller?.onEnabledChange(true)
    await waitFor(() =>
      expect(appsInTossMocks.setScreenAwakeMode).toHaveBeenCalledWith({enabled: true}),
    )
    expect(controller?.isEnabled()).toBe(true)
    expect(controller?.isRequestPending()).toBe(false)

    view.unmount()

    await waitFor(() =>
      expect(appsInTossMocks.setScreenAwakeMode).toHaveBeenLastCalledWith({enabled: false}),
    )
  })

  it('should reapply native awake mode when the app becomes visible again', async () => {
    let controller: ScreenWakeLockController | undefined
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    render(() => (
      <ScreenWakeLockHarness
        onController={(nextController) => {
          controller = nextController
        }}
      />
    ))
    await waitFor(() => expect(controller?.availability()).toBe('supported'))
    controller?.onEnabledChange(true)
    await waitFor(() => expect(appsInTossMocks.setScreenAwakeMode).toHaveBeenCalledTimes(1))

    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(appsInTossMocks.setScreenAwakeMode).toHaveBeenCalledTimes(2))
    expect(appsInTossMocks.setScreenAwakeMode).toHaveBeenLastCalledWith({enabled: true})
  })

  it('should expose a recoverable error when the native request fails', async () => {
    let controller: ScreenWakeLockController | undefined
    appsInTossMocks.setScreenAwakeMode.mockRejectedValueOnce(new Error('bridge unavailable'))
    render(() => (
      <ScreenWakeLockHarness
        onController={(nextController) => {
          controller = nextController
        }}
      />
    ))
    await waitFor(() => expect(controller?.availability()).toBe('supported'))

    controller?.onEnabledChange(true)

    await waitFor(() => expect(controller?.isRequestPending()).toBe(false))
    expect(controller?.isEnabled()).toBe(false)
    expect(controller?.errorMessage()).toBe(
      '화면 유지 요청을 허용하지 못했어요. 앱 설정을 확인해 주세요.',
    )
  })

  it('should keep the browser capability boundary in a regular web build', async () => {
    let controller: ScreenWakeLockController | undefined
    vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')
    render(() => (
      <ScreenWakeLockHarness
        onController={(nextController) => {
          controller = nextController
        }}
      />
    ))

    await waitFor(() => expect(controller?.availability()).toBe('unsupported'))
    expect(appsInTossMocks.setScreenAwakeMode).not.toHaveBeenCalled()
  })
})
