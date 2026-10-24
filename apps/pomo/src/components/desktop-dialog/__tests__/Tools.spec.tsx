/** @vitest-environment jsdom */

import flushPromises from 'flush-promises'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {closeDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {Content} from '../../tools/Content'
import {DesktopToolsDialog} from '../Tools'

const transfer = vi.hoisted(() => ({isActive: false}))
const nativeWindow = vi.hoisted(() => ({
  hide: vi.fn(),
  onCloseRequested: vi.fn(),
  unlisten: vi.fn(),
}))
vi.mock('@tauri-apps/api/window', () => ({getCurrentWindow: vi.fn(() => nativeWindow)}))
vi.mock('../../../features/file-transfer/session', () => ({fileTransfer: transfer}))

vi.mock('../../../features/desktop-mode/dialogs', () => ({closeDesktopDialog: vi.fn()}))
vi.mock('../../tools/Content', () => ({Content: vi.fn()}))

beforeEach(() => {
  nativeWindow.onCloseRequested.mockReset().mockResolvedValue(nativeWindow.unlisten)
  nativeWindow.hide.mockResolvedValue(undefined)
  transfer.isActive = false
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')
  vi.mocked(closeDesktopDialog).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

it('should load the desktop tools content and close its native window', async () => {
  render(() => <DesktopToolsDialog />)

  await waitFor(() => expect(Content).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button'))

  expect(closeDesktopDialog).toHaveBeenCalledExactlyOnceWith('tools')
})

it('should avoid native listener acquisition in the web runtime', async () => {
  render(() => <DesktopToolsDialog />)
  await flushPromises()
  expect(getCurrentWindow).not.toHaveBeenCalled()
})

it('should release the native close listener on unmount and retain transfer close behavior', async () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  const view = render(() => <DesktopToolsDialog />)
  await flushPromises()
  expect(nativeWindow.onCloseRequested).toHaveBeenCalledOnce()
  const handler = nativeWindow.onCloseRequested.mock.calls[0]?.[0]
  const event = {preventDefault: vi.fn()}
  handler(event)
  expect(event.preventDefault).not.toHaveBeenCalled()

  transfer.isActive = true
  handler(event)
  await flushPromises()
  expect(event.preventDefault).toHaveBeenCalledOnce()
  expect(nativeWindow.hide).toHaveBeenCalledOnce()
  view.unmount()
  expect(nativeWindow.unlisten).toHaveBeenCalledOnce()
})

it('should release a close listener arriving after unmount exactly once', async () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  const registration = Promise.withResolvers<() => void>()
  nativeWindow.onCloseRequested.mockReturnValueOnce(registration.promise)
  const view = render(() => <DesktopToolsDialog />)
  await flushPromises()
  view.unmount()
  expect(nativeWindow.unlisten).not.toHaveBeenCalled()
  registration.resolve(nativeWindow.unlisten)
  await flushPromises()
  expect(nativeWindow.unlisten).toHaveBeenCalledOnce()
})

it('should report close listener acquisition errors, including after unmount', async () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  const registration = Promise.withResolvers<() => void>()
  nativeWindow.onCloseRequested.mockReturnValueOnce(registration.promise)
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const view = render(() => <DesktopToolsDialog />)
  await flushPromises()
  view.unmount()
  const error = new Error('registration failed')
  registration.reject(error)
  await flushPromises()
  expect(report).toHaveBeenCalledExactlyOnceWith('Failed to watch the desktop tools dialog.', error)
  report.mockRestore()
})
