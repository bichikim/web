/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {closeDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {Content} from '../../tools/Content'
import {DesktopToolsDialog} from '../Tools'

vi.mock('../../../features/desktop-mode/dialogs', () => ({closeDesktopDialog: vi.fn()}))
vi.mock('../../tools/Content', () => ({Content: vi.fn()}))

beforeEach(() => {
  vi.mocked(closeDesktopDialog).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should load the desktop tools content and close its native window', async () => {
  render(() => <DesktopToolsDialog />)

  await waitFor(() => expect(Content).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button'))

  expect(closeDesktopDialog).toHaveBeenCalledExactlyOnceWith('tools')
})
