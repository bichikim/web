/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const tauri = vi.hoisted(() => ({
  getCurrentWindow: vi.fn(),
  setSize: vi.fn(),
}))

vi.mock('@tauri-apps/api/window', () => ({getCurrentWindow: tauri.getCurrentWindow}))
vi.mock('@tauri-apps/api/dpi', () => ({
  LogicalSize: class LogicalSize {
    readonly height: number
    readonly width: number

    constructor(width: number, height: number) {
      this.height = height
      this.width = width
    }
  },
}))

import {useDesktopSurfaceSize} from '../use-desktop-surface-size'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    TestResizeObserver.instances.push(this)
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const runAnimationFrame = () => {
  const callback = vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0]
  callback?.(0)
}

describe('useDesktopSurfaceSize', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
    vi.stubGlobal('ResizeObserver', TestResizeObserver)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    TestResizeObserver.instances = []
    tauri.setSize.mockResolvedValue(undefined)
    tauri.getCurrentWindow.mockReturnValue({setSize: tauri.setSize})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('keeps the native surface size aligned when late content changes its bounds', async () => {
    let bounds = {height: 190, width: 180}

    const TestSurface = () => {
      const [element, setElement] = createSignal<HTMLElement | null>(null)
      useDesktopSurfaceSize({element})
      return <div ref={setElement} />
    }

    const view = render(() => <TestSurface />)
    const element = view.container.firstElementChild
    if (!(element instanceof HTMLElement)) {
      throw new Error('Expected a surface element')
    }
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
      () => ({height: bounds.height, width: bounds.width}) as DOMRect,
    )

    runAnimationFrame()
    await vi.waitFor(() => expect(tauri.setSize).toHaveBeenCalledOnce())
    expect(tauri.setSize.mock.calls[0]?.[0]).toMatchObject({height: 190, width: 180})

    bounds = {height: 242, width: 180}
    TestResizeObserver.instances[0]?.trigger()
    runAnimationFrame()
    await vi.waitFor(() => expect(tauri.setSize).toHaveBeenCalledTimes(2))
    expect(tauri.setSize.mock.calls[1]?.[0]).toMatchObject({height: 242, width: 180})

    view.unmount()
    expect(TestResizeObserver.instances[0]?.disconnect).toHaveBeenCalledOnce()
  })
})
