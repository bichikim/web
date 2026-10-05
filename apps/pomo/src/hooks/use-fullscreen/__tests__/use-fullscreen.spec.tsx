/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type FullscreenController, useFullscreen} from '..'
import {createDeferred} from 'src/test-utils/create-deferred'

interface FullscreenHarnessProps {
  readonly onController: (controller: FullscreenController) => void
}

const FullscreenHarness = (props: FullscreenHarnessProps) => {
  props.onController(useFullscreen())

  return null
}

const dispatchUnrelatedFullscreenError = () => {
  const unrelatedElement = document.createElement('dialog')
  document.body.append(unrelatedElement)
  unrelatedElement.dispatchEvent(new Event('fullscreenerror', {bubbles: true}))
  unrelatedElement.remove()
}

describe('useFullscreen', () => {
  let fullscreenElement: Element | null
  let requestFullscreen: ReturnType<typeof vi.fn>
  let exitFullscreen: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fullscreenElement = null
    requestFullscreen = vi.fn(async () => {
      fullscreenElement = document.documentElement
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    exitFullscreen = vi.fn(async () => {
      fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    Object.defineProperties(document, {
      exitFullscreen: {configurable: true, value: exitFullscreen},
      fullscreenElement: {configurable: true, get: () => fullscreenElement},
      fullscreenEnabled: {configurable: true, value: true},
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(document, 'exitFullscreen')
    Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document, 'fullscreenEnabled')
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
    vi.restoreAllMocks()
  })

  const renderController = () => {
    let controller: FullscreenController | undefined
    const view = render(() => (
      <FullscreenHarness
        onController={(nextController) => {
          controller = nextController
        }}
      />
    ))

    return {getController: () => controller, view}
  }

  it('should enter and exit full screen while exposing the pending request', async () => {
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))

    getController()?.onEnabledChange(false)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(exitFullscreen).not.toHaveBeenCalled()

    getController()?.onEnabledChange(true)

    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(requestFullscreen.mock.contexts[0]).toBe(document.documentElement)
    expect(getController()?.isEnabled()).toBe(true)
    expect(getController()?.isRequestPending()).toBe(true)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.error()).toBeNull()

    getController()?.onEnabledChange(false)

    expect(exitFullscreen).toHaveBeenCalledOnce()
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(false)
  })

  it('should expose a neutral state before mounting', () => {
    const onController = vi.fn((controller: FullscreenController) => {
      expect(controller.availability()).toBe('checking')
      expect(controller.isEnabled()).toBe(false)
      expect(controller.isRequestPending()).toBe(false)
      expect(controller.error()).toBeNull()
      controller.onEnabledChange(true)
      expect(requestFullscreen).not.toHaveBeenCalled()
    })

    render(() => <FullscreenHarness onController={onController} />)

    expect(onController).toHaveBeenCalledOnce()
  })

  it('should track and exit fullscreen owned by any document element', async () => {
    fullscreenElement = document.createElement('video')
    const {getController} = renderController()

    expect(getController()?.isEnabled()).toBe(true)
    getController()?.onEnabledChange(false)

    expect(exitFullscreen).toHaveBeenCalledOnce()
    expect(exitFullscreen.mock.contexts[0]).toBe(document)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(false)

    fullscreenElement = document.createElement('canvas')
    document.dispatchEvent(new Event('fullscreenchange'))

    expect(getController()?.isEnabled()).toBe(true)
  })

  it('should stop listening to fullscreen changes after disposal', () => {
    const {getController, view} = renderController()
    expect(getController()?.isEnabled()).toBe(false)

    view.unmount()
    fullscreenElement = document.documentElement
    document.dispatchEvent(new Event('fullscreenchange'))

    expect(getController()?.isEnabled()).toBe(false)
  })

  it('should turn the switch off when entering full screen is rejected', async () => {
    requestFullscreen.mockRejectedValueOnce(new TypeError('fullscreen denied'))
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))

    getController()?.onEnabledChange(true)

    expect(getController()?.isEnabled()).toBe(true)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(false)
    expect(getController()?.error()).toBe('enter-failed')
  })

  it('should restore the actual state when exiting full screen is rejected', async () => {
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    exitFullscreen.mockRejectedValueOnce(new TypeError('exit denied'))

    getController()?.onEnabledChange(false)

    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(true)
    expect(getController()?.error()).toBe('exit-failed')
  })

  it('should follow full-screen changes made by the browser', async () => {
    fullscreenElement = document.documentElement
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.isEnabled()).toBe(true))
    getController()?.onEnabledChange(false)
    await waitFor(() => expect(getController()?.isEnabled()).toBe(false))

    fullscreenElement = document.documentElement
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(getController()?.isEnabled()).toBe(true)
    expect(getController()?.error()).toBeNull()

    fullscreenElement = null
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(getController()?.isEnabled()).toBe(false)
  })

  it.each(['policy', 'request', 'exit'] as const)(
    'should disable the controller when the %s capability is unavailable',
    async (missingCapability) => {
      const disableCapability = {
        exit: () =>
          Object.defineProperty(document, 'exitFullscreen', {configurable: true, value: undefined}),
        policy: () =>
          Object.defineProperty(document, 'fullscreenEnabled', {configurable: true, value: false}),
        request: () =>
          Object.defineProperty(document.documentElement, 'requestFullscreen', {
            configurable: true,
            value: undefined,
          }),
      } satisfies Record<typeof missingCapability, () => void>
      disableCapability[missingCapability]()
      const {getController} = renderController()

      await waitFor(() => expect(getController()?.availability()).toBe('unsupported'))
      getController()?.onEnabledChange(true)

      expect(requestFullscreen).not.toHaveBeenCalled()
      expect(getController()?.isEnabled()).toBe(false)
    },
  )

  it('should report when a resolved request does not change the actual state', async () => {
    requestFullscreen.mockResolvedValueOnce(undefined)
    const {getController} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))

    getController()?.onEnabledChange(true)

    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(false)
    expect(getController()?.error()).toBe('enter-failed')

    fullscreenElement = document.documentElement
    document.dispatchEvent(new Event('fullscreenchange'))
    exitFullscreen.mockResolvedValueOnce(undefined)
    getController()?.onEnabledChange(false)

    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.isEnabled()).toBe(true)
    expect(getController()?.error()).toBe('exit-failed')
  })

  it('should ignore another request while a change is pending and stop rejected updates after disposal', async () => {
    let rejectRequest: ((reason: Error) => void) | undefined
    requestFullscreen.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRequest = reject
        }),
    )
    const {getController, view} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))

    const execution = getController()?.onEnabledChange(true)
    getController()?.onEnabledChange(false)

    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(exitFullscreen).not.toHaveBeenCalled()
    view.unmount()
    rejectRequest?.(new Error('owner disposed'))
    await expect(execution).resolves.toBeUndefined()

    expect(getController()?.isEnabled()).toBe(true)
    expect(getController()?.isRequestPending()).toBe(true)
    expect(getController()?.error()).toBeNull()
  })

  it('should stop resolved updates after disposal', async () => {
    let resolveRequest: (() => void) | undefined
    requestFullscreen.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const {getController, view} = renderController()
    await waitFor(() => expect(getController()?.availability()).toBe('supported'))
    const execution = getController()?.onEnabledChange(true)

    view.unmount()
    resolveRequest?.()
    await expect(execution).resolves.toBeUndefined()

    expect(getController()?.isEnabled()).toBe(true)
    expect(getController()?.isRequestPending()).toBe(true)
    expect(getController()?.error()).toBeNull()
  })

  it.each(['enter', 'exit'] as const)(
    'should handle synchronous %s failures without rejecting the UI callback',
    async (direction) => {
      fullscreenElement = direction === 'exit' ? document.documentElement : null
      const method = direction === 'exit' ? exitFullscreen : requestFullscreen
      method.mockImplementationOnce(() => {
        throw new TypeError('denied')
      })
      const {getController} = renderController()
      await expect(getController()?.onEnabledChange(direction === 'enter')).resolves.toBeUndefined()
      expect(getController()?.error()).toBe(direction === 'enter' ? 'enter-failed' : 'exit-failed')
      expect(getController()?.isEnabled()).toBe(direction === 'exit')
      expect(getController()?.isRequestPending()).toBe(false)
    },
  )

  it('should preserve a pending request across change and error events and allow retry', async () => {
    const deferred = createDeferred<void>()
    requestFullscreen.mockReturnValueOnce(deferred.promise)
    const {getController} = renderController()
    const execution = getController()?.onEnabledChange(true)
    document.documentElement.dispatchEvent(new Event('fullscreenerror', {bubbles: true}))
    expect(getController()?.error()).toBeNull()
    expect(getController()?.isEnabled()).toBe(false)
    expect(getController()?.isRequestPending()).toBe(true)
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(getController()?.error()).toBeNull()
    getController()?.onEnabledChange(false)
    getController()?.onEnabledChange(true)
    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(exitFullscreen).not.toHaveBeenCalled()
    deferred.reject(new Error('denied'))
    await expect(execution).resolves.toBeUndefined()
    expect(getController()?.error()).toBe('enter-failed')
    expect(getController()?.isRequestPending()).toBe(false)
    await expect(getController()?.onEnabledChange(true)).resolves.toBeUndefined()
    expect(requestFullscreen).toHaveBeenCalledTimes(2)
    expect(getController()?.error()).toBeNull()
    expect(getController()?.isEnabled()).toBe(true)
  })

  it('should ignore unrelated fullscreen errors before a request and after a successful cycle', async () => {
    const {getController} = renderController()

    dispatchUnrelatedFullscreenError()
    expect(getController()?.error()).toBeNull()
    expect(getController()?.isRequestPending()).toBe(false)

    getController()?.onEnabledChange(true)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    getController()?.onEnabledChange(false)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    dispatchUnrelatedFullscreenError()

    expect(getController()?.error()).toBeNull()
  })

  it('should remove both listeners on disposal while an exit remains pending', async () => {
    fullscreenElement = document.documentElement
    const deferred = createDeferred<void>()
    exitFullscreen.mockReturnValueOnce(deferred.promise)
    const {getController, view} = renderController()
    const execution = getController()?.onEnabledChange(false)
    dispatchUnrelatedFullscreenError()
    expect(getController()?.error()).toBeNull()
    expect(getController()?.isEnabled()).toBe(true)
    view.unmount()
    fullscreenElement = null
    document.dispatchEvent(new Event('fullscreenchange'))
    dispatchUnrelatedFullscreenError()
    deferred.resolve()
    await expect(execution).resolves.toBeUndefined()
    expect(getController()?.isEnabled()).toBe(true)
    expect(getController()?.error()).toBeNull()
    getController()?.onEnabledChange(true)
    expect(requestFullscreen).not.toHaveBeenCalled()
  })
})
