/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const tauri = vi.hoisted(() => ({
  getCurrentWindow: vi.fn(),
  startDragging: vi.fn(),
}))

vi.mock('@tauri-apps/api/window', () => ({getCurrentWindow: tauri.getCurrentWindow}))

import {DesktopSurfaceHandle} from '../DesktopSurfaceHandle'

beforeEach(() => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  tauri.startDragging.mockResolvedValue(undefined)
  tauri.getCurrentWindow.mockReturnValue({startDragging: tauri.startDragging})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

it('should start moving the native window from a primary-pointer drag', async () => {
  render(() => <DesktopSurfaceHandle title="미니 위젯" />)
  const handle = screen.getByRole('button', {name: '미니 위젯 이동 손잡이'})
  let button: number | undefined
  handle.addEventListener('pointerdown', (event) => {
    button = (event as PointerEvent).button
  })

  handle.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0}))

  expect(button).toBe(0)
  await vi.waitFor(() => expect(tauri.startDragging).toHaveBeenCalledOnce())
})

it('should ignore non-primary pointers', async () => {
  render(() => <DesktopSurfaceHandle title="미니 위젯" />)

  screen
    .getByRole('button', {name: '미니 위젯 이동 손잡이'})
    .dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 2}))

  await Promise.resolve()
  expect(tauri.startDragging).not.toHaveBeenCalled()
})
