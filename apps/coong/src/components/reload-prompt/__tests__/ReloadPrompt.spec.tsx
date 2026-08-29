/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {ToastContext} from '@winter-love/solid-components'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {useServiceWorker} from 'src/components/service-worker'
import {ReloadPrompt} from '../ReloadPrompt'

vi.mock('src/components/service-worker', () => ({
  useServiceWorker: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('ReloadPrompt', () => {
  it('should publish update actions and delegate confirm and skip behavior', async () => {
    const handleSkipWaiting = vi.fn().mockResolvedValue(true)
    const handleSkipUpdate = vi.fn()
    vi.mocked(useServiceWorker).mockReturnValue([
      () => ({offline: false, state: 'waiting'}),
      {handleSkipUpdate, handleSkipWaiting},
    ] as unknown as ReturnType<typeof useServiceWorker>)
    const setMessage = vi.fn()
    const turnOffMessage = vi.fn()
    const close = vi.fn()

    render(() => (
      <ToastContext.Provider value={{setMessage, turnOffMessage} as never}>
        <ReloadPrompt pageReload={false} />
      </ToastContext.Provider>
    ))

    const waitingMessage = setMessage.mock.calls[0]?.[0]
    await waitingMessage?.actions?.[0]?.action?.({close})
    waitingMessage?.actions?.[1]?.action?.({close})

    expect(handleSkipWaiting).toHaveBeenCalledOnce()
    expect(handleSkipUpdate).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenCalledTimes(2)
  })

  it('should dismiss the update toast when no worker is waiting', () => {
    vi.mocked(useServiceWorker).mockReturnValue([
      () => ({offline: false, state: 'active'}),
      {handleSkipUpdate: vi.fn(), handleSkipWaiting: vi.fn().mockResolvedValue(true)},
    ] as unknown as ReturnType<typeof useServiceWorker>)
    const setMessage = vi.fn()
    const turnOffMessage = vi.fn()

    render(() => (
      <ToastContext.Provider value={{setMessage, turnOffMessage} as never}>
        <ReloadPrompt pageReload={false} />
      </ToastContext.Provider>
    ))

    expect(turnOffMessage).toHaveBeenCalledWith('__confirm_pwa_update__')
    expect(setMessage).not.toHaveBeenCalled()
  })
})
