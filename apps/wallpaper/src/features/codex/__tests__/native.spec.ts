/** @vitest-environment jsdom */
import {listen} from '@tauri-apps/api/event'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {WebviewWindow} from '@tauri-apps/api/webviewWindow'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {codexPort} from '../native'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/event', () => ({listen: vi.fn()}))
beforeEach(() => {
  vi.spyOn(WebviewWindow.prototype, 'listen').mockImplementation(listen)
  vi.mocked(listen).mockResolvedValue(vi.fn())
})
afterEach(() => {
  clearMocks()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

it('should keep notification subscriptions scoped to each widget and the manager', async () => {
  mockWindows('poffo-bubble-first')
  const stopFirst = await codexPort.subscribe(vi.fn())
  mockWindows('poffo-bubble-second')
  const stopSecond = await codexPort.subscribe(vi.fn())
  mockWindows('manager')
  const stopManager = await codexPort.subscribe(vi.fn())
  expect(vi.mocked(WebviewWindow.prototype.listen).mock.contexts).toEqual([
    expect.objectContaining({label: 'poffo-bubble-first'}),
    expect.objectContaining({label: 'poffo-bubble-second'}),
    expect.objectContaining({label: 'manager'}),
  ])
  stopFirst()
  stopSecond()
  stopManager()
})
