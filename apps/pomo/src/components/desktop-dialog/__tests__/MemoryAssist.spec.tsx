/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {closeDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {PMemoryAssistTabList} from '../../memory-assist/TabList'
import {PMemoryAssistContent} from '../../memory-assist/Content'
import {DesktopMemoryAssistDialog} from '../MemoryAssist'

vi.mock('../../../features/desktop-mode/dialogs', () => ({closeDesktopDialog: vi.fn()}))
vi.mock('../../memory-assist/Content', () => ({PMemoryAssistContent: vi.fn()}))
vi.mock('../../memory-assist/TabList', () => ({PMemoryAssistTabList: vi.fn()}))

beforeEach(() => {
  vi.mocked(closeDesktopDialog).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should load memory assist content and close its native window', async () => {
  render(() => <DesktopMemoryAssistDialog />)

  await waitFor(() => expect(PMemoryAssistContent).toHaveBeenCalledOnce())
  const contentProps = vi.mocked(PMemoryAssistContent).mock.calls[0]?.[0]
  if (contentProps === undefined) {
    throw new Error('Missing memory assist content props')
  }

  expect(PMemoryAssistTabList).toHaveBeenCalledOnce()
  expect(contentProps.calendarRevision).toBe(0)
  if (contentProps.onRefreshCalendar === undefined) {
    throw new Error('Missing calendar refresh callback')
  }
  contentProps.onRefreshCalendar()
  fireEvent.click(screen.getByRole('button'))

  expect(closeDesktopDialog).toHaveBeenCalledExactlyOnceWith('memoryAssist')
})
