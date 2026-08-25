/** @vitest-environment jsdom */

import {mount, StartClient} from '@solidjs/start/client'
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {installClientErrorHandlers} from '../features/client-error-reporter'
import {installPreloadErrorRecovery} from '../features/deployment-recovery'

vi.mock('@solidjs/start/client', () => ({mount: vi.fn(), StartClient: vi.fn()}))
vi.mock('../features/client-error-reporter', () => ({installClientErrorHandlers: vi.fn()}))
vi.mock('../features/deployment-recovery', () => ({installPreloadErrorRecovery: vi.fn()}))

const disposeClientErrorHandlers = vi.fn()
const disposePreloadRecovery = vi.fn()
const markAppStarted = vi.fn()
const moduleMetadataPrototype = Object.getPrototypeOf({}) as object

describe('entry-client', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    vi.mocked(installClientErrorHandlers).mockReturnValue(disposeClientErrorHandlers)
    vi.mocked(installPreloadErrorRecovery).mockReturnValue({
      dispose: disposePreloadRecovery,
      markAppStarted,
    })
    vi.mocked(StartClient).mockReturnValue(null)
    vi.mocked(mount).mockImplementation((renderClient) => {
      createRoot((dispose) => {
        renderClient()
        dispose()
      })
      return vi.fn()
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    Reflect.deleteProperty(moduleMetadataPrototype, 'hot')
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('should install recovery handlers, mount the client, and mark startup complete', async () => {
    await import('../entry-client')

    expect(installClientErrorHandlers).toHaveBeenCalledOnce()
    expect(installPreloadErrorRecovery).toHaveBeenCalledOnce()
    expect(mount).toHaveBeenCalledWith(expect.any(Function), document.querySelector('#root'))
    expect(StartClient).toHaveBeenCalledOnce()
    expect(markAppStarted).toHaveBeenCalledOnce()
  })

  it('should reject startup when the root element is missing', async () => {
    document.body.innerHTML = ''

    await expect(import('../entry-client')).rejects.toThrow('Root element not found')

    expect(mount).not.toHaveBeenCalled()
  })

  it('should dispose preload recovery and rethrow a mount error in a microtask', async () => {
    const mountError = new Error('mount failed')
    const queuedCallbacks: VoidFunction[] = []
    vi.mocked(mount).mockImplementation(() => {
      throw mountError
    })
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queuedCallbacks.push(callback)
    })

    await import('../entry-client')

    expect(disposePreloadRecovery).toHaveBeenCalledOnce()
    expect(markAppStarted).not.toHaveBeenCalled()
    expect(queuedCallbacks).toHaveLength(1)
    expect(queuedCallbacks[0]).toThrow(mountError)
  })

  it('should dispose installed handlers when the module runner provides a hot context', async () => {
    const dispose = vi.fn((callback: VoidFunction) => callback())
    Object.defineProperty(moduleMetadataPrototype, 'hot', {
      configurable: true,
      get: () => ({dispose}),
      set: () => undefined,
    })

    await import('../entry-client')

    expect(dispose).toHaveBeenCalledOnce()
    expect(disposeClientErrorHandlers).toHaveBeenCalledOnce()
    expect(disposePreloadRecovery).toHaveBeenCalledOnce()
  })
})
