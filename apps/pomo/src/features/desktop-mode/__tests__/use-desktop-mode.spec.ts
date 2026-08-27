/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {listen} from '@tauri-apps/api/event'
import {applyDesktopMode, finishDesktopModeTransition} from '../runtime'
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
}))

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []
  readonly listeners: Array<(event: MessageEvent) => void> = []
  readonly postMessage = vi.fn()
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
  vi.mocked(listen).mockClear()
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
  vi.stubEnv('POMO_IS_DESKTOP', '1')
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

it('should publish successful transitions and suppress duplicate concurrent requests', async () => {
  let finishTransition: (() => void) | undefined
  vi.mocked(applyDesktopMode).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishTransition = resolve
      }),
  )
  const view = renderHook(() => useDesktopMode())

  const first = view.result.onModeChange('widget')
  const duplicate = view.result.onModeChange('desktop')
  expect(view.result.isChanging()).toBe(true)
  await duplicate
  expect(applyDesktopMode).toHaveBeenCalledOnce()
  finishTransition?.()
  await first

  expect(view.result.mode()).toBe('widget')
  expect(localStorage.getItem('pomo:desktop-mode:v1')).toBe('widget')
  expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenCalledWith('widget')
  expect(finishDesktopModeTransition).toHaveBeenCalledWith('widget')
  await view.result.onModeChange('widget')
  expect(applyDesktopMode).toHaveBeenCalledOnce()
})

it('should expose native transition failures without changing the mode', async () => {
  const view = renderHook(() => useDesktopMode())
  vi.mocked(applyDesktopMode).mockRejectedValueOnce(new Error('native failed'))

  await expect(view.result.onModeChange('desktop')).rejects.toThrow('native failed')
  expect(view.result.error()).toBe('native failed')
  expect(view.result.mode()).toBe('normal')

  vi.mocked(applyDesktopMode).mockRejectedValueOnce('unknown failure')
  await expect(view.result.onModeChange('widget')).rejects.toBe('unknown failure')
  expect(view.result.error()).toBe('unknown failure')
})

it('should roll back a published mode when controller cleanup fails', async () => {
  localStorage.setItem('pomo:desktop-mode:v1', 'desktop')
  const view = renderHook(() => useDesktopMode())
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
  const view = renderHook(() => useDesktopMode())
  vi.mocked(finishDesktopModeTransition).mockRejectedValueOnce(transitionError)
  vi.mocked(applyDesktopMode).mockResolvedValueOnce().mockRejectedValueOnce(rollbackError)

  await expect(view.result.onModeChange('desktop')).rejects.toMatchObject({
    errors: [transitionError, rollbackError],
    message: 'Desktop mode transition and rollback failed',
  })

  expect(view.result.error()).toBe('Desktop mode transition and rollback failed')
  expect(view.result.mode()).toBe('desktop')
})

it('should not republish a rollback mode already received from another window', async () => {
  const view = renderHook(() => useDesktopMode())
  vi.mocked(finishDesktopModeTransition).mockImplementationOnce(async () => {
    TestBroadcastChannel.instances[0]?.dispatch('normal')
    throw new Error('native close failed')
  })

  await expect(view.result.onModeChange('desktop')).rejects.toThrow('native close failed')

  expect(applyDesktopMode).toHaveBeenNthCalledWith(1, 'desktop')
  expect(applyDesktopMode).toHaveBeenNthCalledWith(2, 'normal')
  expect(view.result.mode()).toBe('normal')
  expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenCalledOnce()
  expect(TestBroadcastChannel.instances[0]?.postMessage).toHaveBeenCalledWith('desktop')
})

it('should release the controller before a surface owner publishes a non-desktop mode', async () => {
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))
  await view.result.onModeChange('desktop')
  vi.mocked(applyDesktopMode).mockClear()
  vi.mocked(finishDesktopModeTransition).mockClear()

  let finishController: (() => void) | undefined
  vi.mocked(finishDesktopModeTransition).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishController = resolve
      }),
  )

  const transition = view.result.onModeChange('normal')
  await vi.waitFor(() => expect(finishDesktopModeTransition).toHaveBeenCalledWith('normal'))
  expect(view.result.mode()).toBe('desktop')
  expect(localStorage.getItem('pomo:desktop-mode:v1')).toBe('desktop')

  finishController?.()
  await transition

  expect(view.result.mode()).toBe('normal')
  expect(localStorage.getItem('pomo:desktop-mode:v1')).toBe('normal')
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
  vi.stubEnv('POMO_IS_DESKTOP', '')
  const view = renderHook(() => useDesktopMode({isSurfaceOwner: true}))

  await view.result.onModeChange('desktop')
  expect(applyDesktopMode).not.toHaveBeenCalled()
  expect(TestBroadcastChannel.instances).toHaveLength(0)
})
