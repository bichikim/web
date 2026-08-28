/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import type {Monitor} from '@tauri-apps/api/window'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getDesktopSafeAreaTop, useDesktopSafeAreaTop} from '../safe-area'

const windowMocks = vi.hoisted(() => ({
  currentMonitor: vi.fn(),
  onResized: vi.fn(),
  onScaleChanged: vi.fn(),
}))

vi.mock('@tauri-apps/api/window', () => ({
  currentMonitor: windowMocks.currentMonitor,
  getCurrentWindow: () => ({
    onResized: windowMocks.onResized,
    onScaleChanged: windowMocks.onScaleChanged,
  }),
}))

const createMonitor = (top: number, workAreaTop: number, scaleFactor = 2): Monitor =>
  ({
    name: 'Built-in Retina Display',
    position: {x: 0, y: top},
    scaleFactor,
    size: {height: 1964, width: 3024},
    workArea: {
      position: {x: 0, y: workAreaTop},
      size: {height: 1840, width: 3024},
    },
  }) as Monitor

describe('desktop safe area', () => {
  beforeEach(() => {
    vi.stubEnv('POMO_IS_DESKTOP', '1')
    windowMocks.currentMonitor.mockReset().mockResolvedValue(createMonitor(0, 48))
    windowMocks.onResized.mockReset().mockResolvedValue(vi.fn())
    windowMocks.onScaleChanged.mockReset().mockResolvedValue(vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('should convert the top work-area offset to logical pixels for background modes', () => {
    const monitor = createMonitor(100, 148)

    expect(getDesktopSafeAreaTop('desktop', monitor)).toBe(24)
    expect(getDesktopSafeAreaTop('interactiveDesktop', monitor)).toBe(24)
    expect(getDesktopSafeAreaTop('normal', monitor)).toBe(0)
    expect(getDesktopSafeAreaTop('widget', monitor)).toBe(0)
    expect(getDesktopSafeAreaTop('desktop', null)).toBe(0)
  })

  it('should apply the monitor inset only while the desktop background is active', async () => {
    const [mode, setMode] = createSignal<'desktop' | 'normal'>('normal')
    let inset = () => -1
    const view = render(() => {
      inset = useDesktopSafeAreaTop(mode)
      return null
    })

    await vi.waitFor(() => expect(windowMocks.onResized).toHaveBeenCalledOnce())
    expect(inset()).toBe(0)

    setMode('desktop')
    await vi.waitFor(() => expect(inset()).toBe(24))

    setMode('normal')
    expect(inset()).toBe(0)
    view.unmount()
  })

  it('should remeasure after the desktop window or display scale changes', async () => {
    const [mode] = createSignal<'interactiveDesktop'>('interactiveDesktop')
    let inset = () => -1
    render(() => {
      inset = useDesktopSafeAreaTop(mode)
      return null
    })

    await vi.waitFor(() => expect(inset()).toBe(24))
    windowMocks.currentMonitor.mockResolvedValue(createMonitor(0, 60))

    const resizeListener = windowMocks.onResized.mock.calls[0]?.[0] as () => void
    resizeListener()
    await vi.waitFor(() => expect(inset()).toBe(30))

    const scaleListener = windowMocks.onScaleChanged.mock.calls[0]?.[0] as () => void
    scaleListener()
    await vi.waitFor(() => expect(windowMocks.currentMonitor).toHaveBeenCalledTimes(3))
  })

  it('should dispose native window listeners', async () => {
    const removeResizeListener = vi.fn()
    const removeScaleListener = vi.fn()
    windowMocks.onResized.mockResolvedValue(removeResizeListener)
    windowMocks.onScaleChanged.mockResolvedValue(removeScaleListener)
    const [mode] = createSignal<'desktop'>('desktop')
    const view = render(() => {
      useDesktopSafeAreaTop(mode)
      return null
    })

    await vi.waitFor(() => expect(windowMocks.onScaleChanged).toHaveBeenCalledOnce())
    view.unmount()

    expect(removeResizeListener).toHaveBeenCalledOnce()
    expect(removeScaleListener).toHaveBeenCalledOnce()
  })

  it('should not load native window state in a web build', async () => {
    vi.stubEnv('POMO_IS_DESKTOP', '')
    const [mode] = createSignal<'desktop'>('desktop')
    let inset = () => -1
    render(() => {
      inset = useDesktopSafeAreaTop(mode)
      return null
    })
    await Promise.resolve()

    expect(inset()).toBe(0)
    expect(windowMocks.currentMonitor).not.toHaveBeenCalled()
  })
})
