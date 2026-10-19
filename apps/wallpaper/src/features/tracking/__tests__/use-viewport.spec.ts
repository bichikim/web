/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {isTauri} from '@tauri-apps/api/core'
import {currentMonitor, getCurrentWindow} from '@tauri-apps/api/window'
import {useViewport} from '../use-viewport'

vi.mock('@tauri-apps/api/core', () => ({isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/window', () => ({currentMonitor: vi.fn(), getCurrentWindow: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should resolve retina coordinates relative to the current monitor and refresh after moving', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(currentMonitor).mockResolvedValue({
    name: 'screen',
    position: {x: 2000, y: -100},
    scaleFactor: 2,
    size: {height: 2000, width: 3000},
  } as Awaited<ReturnType<typeof currentMonitor>>)
  let moved = () => {}
  const stop = vi.fn()
  const position = vi.fn(async () => ({x: 2500, y: 300}))
  vi.mocked(getCurrentWindow).mockReturnValue({
    onMoved: vi.fn(async (callback) => {
      moved = callback
      return stop
    }),
    onResized: vi.fn(async () => stop),
    onScaleChanged: vi.fn(async () => stop),
    outerPosition: position,
    scaleFactor: vi.fn(async () => 2),
  } as unknown as ReturnType<typeof getCurrentWindow>)
  const [enabled, setEnabled] = createSignal(true)
  const {result} = renderHook(() => useViewport(enabled, vi.fn()))
  await waitFor(() =>
    expect(result()).toEqual({height: 2000, scale: 2, width: 3000, x: 500, y: 400}),
  )
  position.mockResolvedValueOnce({x: 2700, y: 500})
  moved()
  await waitFor(() => expect(result()?.x).toBe(700))
  setEnabled(false)
  expect(result()).toBeNull()
  expect(stop).toHaveBeenCalledTimes(3)
})
