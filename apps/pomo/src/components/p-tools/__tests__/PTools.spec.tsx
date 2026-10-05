/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {openDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {toolsDialog} from '../dialog'
import {PTools} from '../PTools'

vi.mock('../../../features/desktop-mode/dialogs', () => ({openDesktopDialog: vi.fn()}))
vi.mock('../dialog', () => ({toolsDialog: {open: vi.fn()}}))
beforeEach(() => {
  vi.mocked(openDesktopDialog).mockResolvedValue(undefined)
})
afterEach(() => vi.clearAllMocks())

it('should open the native tools window from a desktop surface', async () => {
  render(() => <PTools desktopSurface sceneStyle="original" />)
  fireEvent.click(screen.getByRole('button'))
  expect(openDesktopDialog).toHaveBeenCalledExactlyOnceWith('tools')
  expect(toolsDialog.open).not.toHaveBeenCalled()
})

it('should open the shared tools modal and retain the trigger for focus return', () => {
  render(() => <PTools sceneStyle="original" />)
  const trigger = screen.getByRole('button')
  fireEvent.click(trigger)
  expect(toolsDialog.open).toHaveBeenCalledExactlyOnceWith({trigger})
  expect(openDesktopDialog).not.toHaveBeenCalled()
})
