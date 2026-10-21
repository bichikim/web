/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebview} from '@tauri-apps/api/webview'
import {getCurrentWindow, PhysicalPosition, PhysicalSize} from '@tauri-apps/api/window'
import {afterEach, expect, it, vi} from 'vitest'
import {useWidgetResize} from '../use-widget-resize'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/webview', () => ({getCurrentWebview: vi.fn()}))
vi.mock('@tauri-apps/api/window', async () => {
  const actual =
    await vi.importActual<typeof import('@tauri-apps/api/window')>('@tauri-apps/api/window')
  return {...actual, getCurrentWindow: vi.fn()}
})

const createWindow = () => {
  const window = {
    innerSize: vi.fn().mockResolvedValue(new PhysicalSize(640, 840)),
    onResized: vi.fn().mockResolvedValue(vi.fn()),
    outerPosition: vi.fn().mockResolvedValue(new PhysicalPosition(100, 200)),
    scaleFactor: vi.fn().mockResolvedValue(2),
    setPosition: vi.fn().mockResolvedValue(undefined),
    setResizable: vi.fn().mockResolvedValue(undefined),
    setSize: vi.fn().mockResolvedValue(undefined),
    startResizeDragging: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(false)
  vi.mocked(getCurrentWebview).mockReturnValue({
    setFocus: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof getCurrentWebview>)
  vi.mocked(getCurrentWindow).mockReturnValue(
    window as unknown as ReturnType<typeof getCurrentWindow>,
  )
  return window
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

it('should enable handles only during adjustment and persist logical size on completion', async () => {
  const window = createWindow()
  const onSave = vi.fn().mockResolvedValue(undefined)
  const {result} = renderHook(() => useWidgetResize({onSave}))
  expect(result.editing()).toBe(false)
  await result.begin()
  expect(window.setResizable).toHaveBeenCalledWith(true)
  expect(result.editing()).toBe(true)
  expect(onSave).not.toHaveBeenCalled()
  window.innerSize.mockResolvedValue(new PhysicalSize(960, 1260))
  await result.finish()
  expect(onSave).toHaveBeenCalledExactlyOnceWith({height: 630, width: 480})
  expect(window.setResizable).toHaveBeenLastCalledWith(false)
  expect(result.editing()).toBe(false)
})

it('should restore the original size and position on cancellation without saving', async () => {
  const window = createWindow()
  const onSave = vi.fn()
  const {result} = renderHook(() => useWidgetResize({onSave}))
  await result.begin()
  await result.cancel()
  expect(window.setSize).toHaveBeenCalledWith(new PhysicalSize(640, 840))
  expect(window.setPosition).toHaveBeenCalledWith(new PhysicalPosition(100, 200))
  expect(result.editing()).toBe(false)
  expect(onSave).not.toHaveBeenCalled()
})

it('should keep adjustment open when saving fails so it can be retried', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  createWindow()
  const onSave = vi.fn().mockRejectedValueOnce(new Error('storage')).mockResolvedValue(undefined)
  const {result} = renderHook(() => useWidgetResize({onSave}))
  await result.begin()
  await result.finish()
  expect(result.editing()).toBe(true)
  expect(result.error()).not.toBeNull()
  await result.finish()
  expect(result.editing()).toBe(false)
  expect(result.error()).toBeNull()
})

it('should ignore resize handles before adjustment and reject non-primary pointer input', async () => {
  const window = createWindow()
  const {result} = renderHook(() => useWidgetResize({onSave: vi.fn()}))
  const event = {button: 0, preventDefault: vi.fn(), stopPropagation: vi.fn()}
  await result.resize('SouthEast', event)
  expect(window.startResizeDragging).not.toHaveBeenCalled()
  await result.begin()
  await result.resize('SouthEast', {...event, button: 2})
  expect(window.startResizeDragging).not.toHaveBeenCalled()
  await result.resize('SouthEast', event)
  expect(invoke).toHaveBeenCalledExactlyOnceWith('start_poffo_resize', {direction: 'SouthEast'})
  expect(window.startResizeDragging).toHaveBeenCalledWith('SouthEast')
})

it('should resize from the visible handle through the macOS implementation without starting another drag', async () => {
  const window = createWindow()
  vi.mocked(invoke).mockResolvedValue(true)
  const {result} = renderHook(() => useWidgetResize({onSave: vi.fn()}))
  await result.begin()
  const event = {button: 0, preventDefault: vi.fn(), stopPropagation: vi.fn()}
  await result.resize('NorthWest', event)
  expect(invoke).toHaveBeenCalledExactlyOnceWith('start_poffo_resize', {direction: 'NorthWest'})
  expect(window.startResizeDragging).not.toHaveBeenCalled()
  expect(event.preventDefault).toHaveBeenCalledOnce()
  expect(event.stopPropagation).toHaveBeenCalledOnce()
})

it('should report a resize-start failure without starting an unrelated drag', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const window = createWindow()
  vi.mocked(invoke).mockRejectedValue(new Error('native resize'))
  const {result} = renderHook(() => useWidgetResize({onSave: vi.fn()}))
  await result.begin()
  await result.resize('East', {button: 0, preventDefault: vi.fn(), stopPropagation: vi.fn()})
  expect(result.error()).not.toBeNull()
  expect(result.editing()).toBe(true)
  expect(window.startResizeDragging).not.toHaveBeenCalled()
})

it('should return to idle after native initialization fails and permit another attempt', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const window = createWindow()
  window.setResizable.mockRejectedValueOnce(new Error('native'))
  const {result} = renderHook(() => useWidgetResize({onSave: vi.fn()}))
  await result.begin()
  expect(result.editing()).toBe(false)
  expect(result.busy()).toBe(false)
  expect(result.error()).not.toBeNull()
  await result.begin()
  expect(result.editing()).toBe(true)
  expect(result.error()).toBeNull()
})

it('should resize with keyboard input, constrain the minimum, and restore with Escape', async () => {
  const window = createWindow()
  const {result} = renderHook(() => useWidgetResize({onSave: vi.fn()}))
  await result.begin()
  const event = new KeyboardEvent('keydown', {cancelable: true, key: 'ArrowRight'})
  await result.keyboard(event)
  expect(window.setSize).toHaveBeenLastCalledWith(
    expect.objectContaining({height: 420, width: 336}),
  )
  expect(event.defaultPrevented).toBe(true)
  window.innerSize.mockResolvedValue(new PhysicalSize(320, 420))
  await result.keyboard(new KeyboardEvent('keydown', {key: 'ArrowLeft'}))
  expect(window.setSize).toHaveBeenLastCalledWith(
    expect.objectContaining({height: 210, width: 160}),
  )
  await result.keyboard(new KeyboardEvent('keydown', {key: 'Escape'}))
  expect(result.editing()).toBe(false)
  expect(window.setSize).toHaveBeenLastCalledWith(new PhysicalSize(640, 840))
})

it('should restore webview focus after native resizing and stop listening when adjustment finishes', async () => {
  const window = createWindow()
  const stop = vi.fn()
  window.onResized.mockResolvedValue(stop)
  const {result} = renderHook(() => useWidgetResize({onSave: vi.fn()}))
  await result.begin()
  const resize = window.onResized.mock.calls[0]![0]
  resize()
  expect(getCurrentWebview().setFocus).toHaveBeenCalledOnce()
  await result.finish()
  expect(stop).toHaveBeenCalledOnce()
  resize()
  expect(getCurrentWebview().setFocus).toHaveBeenCalledOnce()
})
