/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {isTauri} from '@tauri-apps/api/core'
import {emitTo} from '@tauri-apps/api/event'
import {afterEach, expect, it, vi} from 'vitest'
import {SPoffoWidgetPlacement} from '../SPoffoWidgetPlacement'

vi.mock('@tauri-apps/api/core', () => ({isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/event', () => ({emitTo: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
it('should request adjustment only from the selected native widget', () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(emitTo).mockResolvedValue(undefined)
  render(() => <SPoffoWidgetPlacement widgetId="second" />)
  fireEvent.click(screen.getByRole('button', {name: '크기 및 위치 조정'}))
  expect(emitTo).toHaveBeenCalledExactlyOnceWith('poffo-widget-second', 'poffo-adjustment')
})
it('should keep native placement unavailable in a browser preview', () => {
  vi.mocked(isTauri).mockReturnValue(false)
  render(() => <SPoffoWidgetPlacement widgetId="second" />)
  expect(screen.getByRole('button', {name: '크기 및 위치 조정'})).toBeDisabled()
  expect(emitTo).not.toHaveBeenCalled()
})
it('should report an adjustment request failure without changing widget geometry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(emitTo).mockRejectedValue(new Error('unavailable'))
  render(() => <SPoffoWidgetPlacement widgetId="second" />)
  fireEvent.click(screen.getByRole('button', {name: '크기 및 위치 조정'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('위젯 조정을 시작하지 못했어요.')
})
