/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type ScreenWakeLockController, useScreenWakeLock} from '..'

const appsInTossMocks = vi.hoisted(() => ({
  setAwakeMode: vi.fn(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Screen: {setAwakeMode: appsInTossMocks.setAwakeMode},
}))

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
    appsInTossMocks.setAwakeMode
      .mockReset()
      .mockImplementation(({enabled}) => Promise.resolve({enabled}))
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock')
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  const renderController = () => {
    let controller: ScreenWakeLockController | undefined
    const view = render(() => (
      <ScreenWakeLockHarness
        onController={(nextController) => {
          controller = nextController
        }}
      />
    ))

    return {getController: () => controller, view}
  }

  const createSentinel = () => {
    let releaseListener: (() => void) | undefined
    const sentinel = {
      addEventListener: vi.fn((_eventName: string, listener: () => void) => {
        releaseListener = listener
      }),
      release: vi.fn().mockResolvedValue(undefined),
      released: false,
    } as unknown as WakeLockSentinel

    return {getReleaseListener: () => releaseListener, sentinel}
  }

  const setBrowserWakeLock = (request: ReturnType<typeof vi.fn>) => {
    vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {request},
    })
  }

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
    await waitFor(() => expect(appsInTossMocks.setAwakeMode).toHaveBeenCalledWith({enabled: true}))
    expect(controller?.isEnabled()).toBe(true)
    expect(controller?.isRequestPending()).toBe(false)

    view.unmount()

    await waitFor(() =>
      expect(appsInTossMocks.setAwakeMode).toHaveBeenLastCalledWith({enabled: false}),
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
    await waitFor(() => expect(appsInTossMocks.setAwakeMode).toHaveBeenCalledTimes(1))

    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(appsInTossMocks.setAwakeMode).toHaveBeenCalledTimes(2))
    expect(appsInTossMocks.setAwakeMode).toHaveBeenLastCalledWith({enabled: true})
  })

  it('should expose a recoverable error when the native request fails', async () => {
    let controller: ScreenWakeLockController | undefined
    appsInTossMocks.setAwakeMode.mockRejectedValueOnce(new Error('bridge unavailable'))
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
    expect(appsInTossMocks.setAwakeMode).not.toHaveBeenCalled()
  })

  it('should acquire and release the browser wake lock', async () => {
    const {sentinel} = createSentinel()
    const request = vi.fn().mockResolvedValue(sentinel)
    setBrowserWakeLock(request)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const {getController, view} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))

    getController()?.onEnabledChange(true)
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
    expect(getController()?.isRequestPending()).toBe(false)
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(request).toHaveBeenCalledOnce()

    getController()?.onEnabledChange(false)
    await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
    view.unmount()
  })

  it('should re-acquire a released browser wake lock when the document becomes visible', async () => {
    const first = createSentinel()
    const second = createSentinel()
    const request = vi
      .fn()
      .mockResolvedValueOnce(first.sentinel)
      .mockResolvedValueOnce(second.sentinel)
    setBrowserWakeLock(request)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    Object.defineProperty(first.sentinel, 'released', {value: true})

    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })

  it('should expose a browser permission error when acquisition fails', async () => {
    const request = vi.fn().mockRejectedValue(new Error('denied'))
    setBrowserWakeLock(request)
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))

    getController()?.onEnabledChange(true)

    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(false)
    expect(getController()?.errorMessage()).toBe(
      '화면 유지 요청을 허용하지 못했어요. 브라우저 설정을 확인해 주세요.',
    )
  })

  it('should release a browser wake lock that resolves after being disabled', async () => {
    const {sentinel} = createSentinel()
    let resolveRequest: ((sentinel: WakeLockSentinel) => void) | undefined
    const request = vi.fn(
      () =>
        new Promise<WakeLockSentinel>((resolve) => {
          resolveRequest = resolve
        }),
    )
    setBrowserWakeLock(request)
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    getController()?.onEnabledChange(true)
    getController()?.onEnabledChange(false)

    resolveRequest?.(sentinel)

    await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
  })

  it('should surface an unexpected browser wake-lock release while visible', async () => {
    const {getReleaseListener, sentinel} = createSentinel()
    const request = vi.fn().mockResolvedValue(sentinel)
    setBrowserWakeLock(request)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(getReleaseListener()).toBeTypeOf('function'))

    getReleaseListener()?.()

    expect(getController()?.isEnabled()).toBe(false)
    expect(getController()?.errorMessage()).toBe('화면 유지가 해제되었어요. 다시 켜 주세요.')
  })

  it('should preserve the current state for a stale or hidden release event', async () => {
    const first = createSentinel()
    const second = createSentinel()
    const request = vi
      .fn()
      .mockResolvedValueOnce(first.sentinel)
      .mockResolvedValueOnce(second.sentinel)
    setBrowserWakeLock(request)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(first.getReleaseListener()).toBeTypeOf('function'))
    first.getReleaseListener()?.()
    expect(getController()?.isEnabled()).toBe(true)

    document.dispatchEvent(new Event('visibilitychange'))
    expect(request).toHaveBeenCalledOnce()
    getController()?.onEnabledChange(false)
    first.getReleaseListener()?.()
    expect(getController()?.errorMessage()).toBeNull()
  })

  it('should report a browser wake-lock release failure', async () => {
    const {sentinel} = createSentinel()
    vi.mocked(sentinel.release).mockRejectedValue(new Error('release failed'))
    const request = vi.fn().mockResolvedValue(sentinel)
    setBrowserWakeLock(request)
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(request).toHaveBeenCalledOnce())

    getController()?.onEnabledChange(false)

    await waitFor(() =>
      expect(getController()?.errorMessage()).toBe(
        '화면 유지 기능을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.',
      ),
    )
  })

  it('should report an unexpected native response and a failed native disable request', async () => {
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    appsInTossMocks.setAwakeMode.mockResolvedValueOnce({enabled: false})
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(false)

    appsInTossMocks.setAwakeMode.mockRejectedValueOnce(new Error('disable failed'))
    getController()?.onEnabledChange(false)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.errorMessage()).toBe(
      '화면 유지 기능을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.',
    )
  })

  it('should not restore native awake mode when it was never requested', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const {view} = renderController()
    await Promise.resolve()

    document.dispatchEvent(new Event('visibilitychange'))

    view.unmount()

    expect(appsInTossMocks.setAwakeMode).not.toHaveBeenCalled()
  })

  it('should contain a native cleanup failure after the owner unmounts', async () => {
    appsInTossMocks.setAwakeMode
      .mockResolvedValueOnce({enabled: true})
      .mockRejectedValueOnce(new Error('cleanup failed'))
    const {getController, view} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))

    view.unmount()

    await waitFor(() => expect(appsInTossMocks.setAwakeMode).toHaveBeenCalledTimes(2))
  })
})
