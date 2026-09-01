/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {listen} from '@tauri-apps/api/event'
import {
  applyDesktopMode,
  finishDesktopModeTransition,
  prepareDesktopModeTransition,
} from '../runtime'
import {useDesktopMode} from '../use-desktop-mode'

const tauriMocks = vi.hoisted(() => ({listener: vi.fn(), unlisten: vi.fn()}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (_event, listener) => {
    tauriMocks.listener = listener
    return tauriMocks.unlisten
  }),
}))
vi.mock('../runtime', () => ({
  applyDesktopMode: vi.fn(),
  finishDesktopModeTransition: vi.fn(),
  prepareDesktopModeTransition: vi.fn(),
}))

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []
  readonly listeners: Array<(event: MessageEvent) => void> = []
  readonly postMessage = vi.fn<(data: unknown) => void>()
  readonly close = vi.fn()

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this)
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener)
  }

  dispatch(data: unknown) {
    for (const listener of this.listeners) {
      listener(new MessageEvent('message', {data}))
    }
  }
}

beforeEach(() => {
  localStorage.clear()
  TestBroadcastChannel.instances = []
  tauriMocks.listener = vi.fn()
  tauriMocks.unlisten.mockReset()
  vi.mocked(applyDesktopMode).mockReset().mockResolvedValue()
  vi.mocked(finishDesktopModeTransition).mockReset().mockResolvedValue()
  vi.mocked(prepareDesktopModeTransition).mockReset().mockResolvedValue()
  vi.mocked(listen).mockClear()
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should recover normal mode after an unclean exit and mark a clean unload', async () => {
  localStorage.setItem('pomo:desktop-mode:v1', 'desktop')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))

  expect(view.result.mode()).toBe('normal')
  expect(localStorage.getItem('pomo:desktop-clean-exit:v1')).toBe('false')
  window.dispatchEvent(new Event('beforeunload'))
  expect(localStorage.getItem('pomo:desktop-clean-exit:v1')).toBe('true')

  view.cleanup()
  await vi.waitFor(() => expect(tauriMocks.unlisten).toHaveBeenCalledOnce())
  expect(TestBroadcastChannel.instances[0]?.close).toHaveBeenCalledOnce()
})

it('should restore a persisted mode after a clean exit and react to native requests', async () => {
  localStorage.setItem('pomo:desktop-mode:v1', 'desktop')
  localStorage.setItem('pomo:desktop-clean-exit:v1', 'true')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))

  await vi.waitFor(() => expect(view.result.mode()).toBe('desktop'))
  expect(applyDesktopMode).toHaveBeenCalledWith('desktop')

  tauriMocks.listener({payload: 'widget'})
  await vi.waitFor(() => expect(view.result.mode()).toBe('widget'))
  tauriMocks.listener({payload: 'invalid'})
  expect(view.result.mode()).toBe('widget')
})

it('should process the latest native request received during a transition', async () => {
  let finishTransition: (() => void) | undefined
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  await vi.waitFor(() => expect(listen).toHaveBeenCalledOnce())
  vi.mocked(applyDesktopMode).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishTransition = resolve
      }),
  )

  tauriMocks.listener({payload: 'desktop'})
  await vi.waitFor(() => expect(applyDesktopMode).toHaveBeenCalledWith('desktop'))
  tauriMocks.listener({payload: 'widget'})
  finishTransition?.()

  await vi.waitFor(() => expect(view.result.mode()).toBe('widget'))
  expect(applyDesktopMode).toHaveBeenNthCalledWith(2, 'widget')
})

it('should expose native request failures without rejecting the event listener', async () => {
  const transitionError = new Error('native transition failed')
  const rollbackError = new Error('native rollback failed')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  await vi.waitFor(() => expect(listen).toHaveBeenCalledOnce())
  vi.mocked(applyDesktopMode)
    .mockRejectedValueOnce(transitionError)
    .mockRejectedValueOnce(rollbackError)

  tauriMocks.listener({payload: 'desktop'})

  await vi.waitFor(() =>
    expect(view.result.error()).toBe('Desktop mode transition and rollback failed'),
  )
  expect(view.result.mode()).toBe('normal')
})

it('should converge a secondary control window through storage and broadcast messages', () => {
  localStorage.setItem('pomo:desktop-mode:v1', 'desktop')
  const view = renderHook(() => useDesktopMode())
  const channel = TestBroadcastChannel.instances[0]

  expect(view.result.mode()).toBe('desktop')
  channel?.dispatch('widget')
  expect(view.result.mode()).toBe('widget')
  channel?.dispatch('invalid')
  expect(view.result.mode()).toBe('widget')
  expect(listen).not.toHaveBeenCalled()
})

it('should clear a stale local error when another window publishes a mode', async () => {
  const view = renderHook(() => useDesktopMode())
  const channel = TestBroadcastChannel.instances[0]
  const request = view.result.onModeChange('desktop')
  const requestFailure = request.catch((requestError: unknown) => requestError)
  const requestMessage = channel?.postMessage.mock.calls[0]?.[0]
  if (
    typeof requestMessage !== 'object' ||
    requestMessage === null ||
    !('requestId' in requestMessage) ||
    typeof requestMessage.requestId !== 'string'
  ) {
    throw new Error('Expected a desktop mode request message')
  }

  channel?.dispatch({
    message: 'native failed',
    requestId: requestMessage.requestId,
    type: 'mode-change-failed',
  })
  await expect(requestFailure).resolves.toMatchObject({message: 'native failed'})
  expect(view.result.error()).toBe('native failed')

  channel?.dispatch('widget')
  expect(view.result.mode()).toBe('widget')
  expect(view.result.error()).toBeNull()
})

it('should route a secondary mode change through the surface owner', async () => {
  const owner = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  const secondary = renderHook(() => useDesktopMode())
  const ownerChannel = TestBroadcastChannel.instances[0]
  const secondaryChannel = TestBroadcastChannel.instances[1]

  const request = secondary.result.onModeChange('desktop')

  expect(applyDesktopMode).not.toHaveBeenCalled()
  expect(secondary.result.isChanging()).toBe(true)
  expect(secondaryChannel?.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({mode: 'desktop', type: 'mode-requested'}),
  )
  await secondary.result.onModeChange('widget')
  expect(secondaryChannel?.postMessage).toHaveBeenCalledOnce()

  const requestMessage = secondaryChannel?.postMessage.mock.calls[0]?.[0]
  ownerChannel?.dispatch(requestMessage)
  await vi.waitFor(() => expect(owner.result.mode()).toBe('desktop'))

  secondaryChannel?.dispatch({requestId: 'another-request', type: 'mode-change-completed'})
  expect(secondary.result.isChanging()).toBe(true)
  for (const [message] of ownerChannel?.postMessage.mock.calls ?? []) {
    secondaryChannel?.dispatch(message)
  }
  await request

  expect(applyDesktopMode).toHaveBeenCalledOnce()
  expect(secondary.result.mode()).toBe('desktop')
  expect(secondary.result.isChanging()).toBe(false)
  await secondary.result.onModeChange('desktop')
  expect(secondaryChannel?.postMessage).toHaveBeenCalledOnce()
})

it('should return a surface owner failure to the requesting secondary window', async () => {
  vi.mocked(applyDesktopMode).mockRejectedValueOnce(new Error('native failed'))
  renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  const secondary = renderHook(() => useDesktopMode())
  const ownerChannel = TestBroadcastChannel.instances[0]
  const secondaryChannel = TestBroadcastChannel.instances[1]

  const request = secondary.result.onModeChange('desktop')
  const requestFailure = request.catch((requestError: unknown) => requestError)

  expect(applyDesktopMode).not.toHaveBeenCalled()
  const requestMessage = secondaryChannel?.postMessage.mock.calls[0]?.[0]
  ownerChannel?.dispatch(requestMessage)
  await vi.waitFor(() =>
    expect(ownerChannel?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({message: 'native failed', type: 'mode-change-failed'}),
    ),
  )

  const failureMessage = ownerChannel?.postMessage.mock.calls.find(
    ([message]) =>
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'mode-change-failed',
  )?.[0]
  secondaryChannel?.dispatch(failureMessage)

  await expect(requestFailure).resolves.toMatchObject({message: 'native failed'})
  expect(secondary.result.error()).toBe('native failed')
  expect(secondary.result.isChanging()).toBe(false)
})

it('should serialize owner mode changes', async () => {
  let finishTransition: (() => void) | undefined
  vi.mocked(applyDesktopMode).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishTransition = resolve
      }),
  )
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))

  const first = view.result.onModeChange('widget')
  const second = view.result.onModeChange('desktop')
  await vi.waitFor(() => expect(applyDesktopMode).toHaveBeenCalledOnce())
  expect(view.result.isChanging()).toBe(true)
  finishTransition?.()
  await Promise.all([first, second])

  expect(view.result.mode()).toBe('desktop')
  expect(localStorage.getItem('pomo:desktop-mode:v1')).toBe('desktop')
  expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenCalledWith('widget')
  expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenCalledWith('desktop')
  expect(prepareDesktopModeTransition).toHaveBeenCalledWith('widget')
  expect(finishDesktopModeTransition).toHaveBeenCalledWith('widget')
  expect(applyDesktopMode).toHaveBeenCalledTimes(2)
  await view.result.onModeChange('desktop')
  expect(applyDesktopMode).toHaveBeenCalledTimes(2)
})

it('should restore the previous native mode when applying the next mode fails', async () => {
  localStorage.setItem('pomo:desktop-mode:v1', 'interactiveDesktop')
  localStorage.setItem('pomo:desktop-clean-exit:v1', 'true')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  await vi.waitFor(() => expect(view.result.mode()).toBe('interactiveDesktop'))
  vi.mocked(applyDesktopMode).mockClear()
  vi.mocked(finishDesktopModeTransition).mockClear()
  vi.mocked(prepareDesktopModeTransition).mockClear()
  TestBroadcastChannel.instances[0]?.postMessage.mockClear()
  vi.mocked(applyDesktopMode).mockRejectedValueOnce(new Error('native failed'))

  await expect(view.result.onModeChange('desktop')).rejects.toThrow('native failed')
  expect(view.result.error()).toBe('native failed')
  expect(view.result.mode()).toBe('interactiveDesktop')
  expect(applyDesktopMode).toHaveBeenNthCalledWith(1, 'desktop')
  expect(applyDesktopMode).toHaveBeenNthCalledWith(2, 'interactiveDesktop')

  vi.mocked(applyDesktopMode).mockRejectedValueOnce('unknown failure')
  await expect(view.result.onModeChange('widget')).rejects.toBe('unknown failure')
  expect(view.result.error()).toBe('unknown failure')
})

it('should preserve apply and rollback failures together', async () => {
  const transitionError = new Error('native transition failed')
  const rollbackError = new Error('native rollback failed')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  vi.mocked(applyDesktopMode)
    .mockRejectedValueOnce(transitionError)
    .mockRejectedValueOnce(rollbackError)

  await expect(view.result.onModeChange('desktop')).rejects.toMatchObject({
    errors: [transitionError, rollbackError],
    message: 'Desktop mode transition and rollback failed',
  })

  expect(view.result.error()).toBe('Desktop mode transition and rollback failed')
  expect(view.result.mode()).toBe('normal')
})

it('should roll back a published mode when controller cleanup fails', async () => {
  localStorage.setItem('pomo:desktop-mode:v1', 'desktop')
  localStorage.setItem('pomo:desktop-clean-exit:v1', 'true')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  await vi.waitFor(() => expect(view.result.mode()).toBe('desktop'))
  vi.mocked(applyDesktopMode).mockClear()
  vi.mocked(finishDesktopModeTransition).mockClear()
  vi.mocked(prepareDesktopModeTransition).mockClear()
  TestBroadcastChannel.instances[0]?.postMessage.mockClear()
  vi.mocked(finishDesktopModeTransition).mockRejectedValueOnce(new Error('native close failed'))

  await expect(view.result.onModeChange('normal')).rejects.toThrow('native close failed')

  expect(applyDesktopMode).toHaveBeenNthCalledWith(1, 'normal')
  expect(applyDesktopMode).toHaveBeenNthCalledWith(2, 'desktop')
  expect(view.result.mode()).toBe('desktop')
  expect(view.result.error()).toBe('native close failed')
  expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenNthCalledWith(1, 'normal')
  expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenNthCalledWith(2, 'desktop')
})

it('should preserve both failures when a published mode cannot be rolled back', async () => {
  const transitionError = new Error('native close failed')
  const rollbackError = new Error('native restore failed')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  vi.mocked(finishDesktopModeTransition).mockRejectedValueOnce(transitionError)
  vi.mocked(applyDesktopMode).mockResolvedValueOnce().mockRejectedValueOnce(rollbackError)

  await expect(view.result.onModeChange('desktop')).rejects.toMatchObject({
    errors: [transitionError, rollbackError],
    message: 'Desktop mode transition and rollback failed',
  })

  expect(view.result.error()).toBe('Desktop mode transition and rollback failed')
  expect(view.result.mode()).toBe('desktop')
})

it('should close content before a surface owner publishes and close settings afterward', async () => {
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  await view.result.onModeChange('desktop')
  vi.mocked(applyDesktopMode).mockClear()
  vi.mocked(finishDesktopModeTransition).mockClear()
  vi.mocked(prepareDesktopModeTransition).mockClear()

  let finishContent: (() => void) | undefined
  vi.mocked(prepareDesktopModeTransition).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishContent = resolve
      }),
  )

  const transition = view.result.onModeChange('normal')
  await vi.waitFor(() => expect(prepareDesktopModeTransition).toHaveBeenCalledWith('normal'))
  expect(view.result.mode()).toBe('desktop')
  expect(localStorage.getItem('pomo:desktop-mode:v1')).toBe('desktop')

  finishContent?.()
  await transition

  expect(view.result.mode()).toBe('normal')
  expect(localStorage.getItem('pomo:desktop-mode:v1')).toBe('normal')
  expect(finishDesktopModeTransition).toHaveBeenCalledWith('normal')
})

it('should expose native event-listener registration failures', async () => {
  vi.mocked(listen).mockRejectedValueOnce(new Error('event listener failed'))
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))

  await vi.waitFor(() => expect(view.result.error()).toBe('event listener failed'))
})

it('should ignore an event-listener registration failure after cleanup', async () => {
  let rejectListen: ((error: unknown) => void) | undefined
  vi.mocked(listen).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectListen = reject
      }),
  )
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))

  await vi.waitFor(() => expect(listen).toHaveBeenCalledOnce())
  view.cleanup()
  rejectListen?.(new Error('late listener failure'))
  await Promise.resolve()

  expect(view.result.error()).toBeNull()
})

it('should remain inert in the web runtime', async () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))

  await view.result.onModeChange('desktop')
  expect(applyDesktopMode).not.toHaveBeenCalled()
  expect(TestBroadcastChannel.instances).toHaveLength(0)
})
