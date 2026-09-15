/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {closeDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {PPomodoro} from '../../p-pomodoro/PPomodoro'
import {DesktopPomodoroDialog} from '../Pomodoro'

vi.mock('../../../features/desktop-mode/dialogs', () => ({closeDesktopDialog: vi.fn()}))
vi.mock('../../p-pomodoro/PPomodoro', () => ({PPomodoro: vi.fn()}))

beforeEach(() => {
  vi.mocked(closeDesktopDialog).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should render the desktop Pomodoro content and close its native window', () => {
  render(() => <DesktopPomodoroDialog />)

  expect(PPomodoro).toHaveBeenCalledWith({desktopDialog: true})

  fireEvent.click(screen.getByRole('button'))

  expect(closeDesktopDialog).toHaveBeenCalledExactlyOnceWith('pomodoro')
})
