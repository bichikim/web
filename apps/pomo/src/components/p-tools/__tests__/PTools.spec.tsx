/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {openDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {PModal} from '../../p-modal/PModal'
import {PTools} from '../PTools'

vi.mock('../../../features/desktop-mode/dialogs', () => ({openDesktopDialog: vi.fn()}))
vi.mock('../../p-modal/PModal', () => ({PModal: vi.fn()}))

beforeEach(() => {
  vi.mocked(openDesktopDialog).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should open the native tools window from a desktop surface', async () => {
  render(() => <PTools desktopSurface sceneStyle="original" />)

  fireEvent.click(screen.getByRole('button'))

  expect(openDesktopDialog).toHaveBeenCalledExactlyOnceWith('tools')
})

it('should keep the regular tools modal on non-desktop surfaces', () => {
  render(() => <PTools sceneStyle="original" />)

  const modalProps = vi.mocked(PModal).mock.calls[0]?.[0]
  if (modalProps === undefined) {
    throw new Error('Missing tools modal props')
  }

  fireEvent.click(screen.getByRole('button'))

  expect(modalProps.isOpen).toBe(true)
  expect(openDesktopDialog).not.toHaveBeenCalled()
})
