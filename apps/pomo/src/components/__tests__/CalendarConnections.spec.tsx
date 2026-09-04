/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {
  createCalendarAuthorization,
  deleteCalendarConnection,
  listCalendarConnections,
  openCalendarAuthorization,
} from '../../features/calendar'
import {CalendarConnections} from '../CalendarConnections'

vi.mock('../../features/calendar', () => ({
  CALENDAR_PROVIDERS: ['google', 'microsoft'],
  createCalendarAuthorization: vi.fn(),
  deleteCalendarConnection: vi.fn(),
  listCalendarConnections: vi.fn(),
  openCalendarAuthorization: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listCalendarConnections).mockResolvedValue([
    {accountLabel: 'person@example.com', id: 'connection-1', provider: 'google'},
  ])
  vi.mocked(createCalendarAuthorization).mockResolvedValue('https://accounts.google.com/authorize')
})

it('should show provider actions in a settings popover', async () => {
  const onConnectionsChange = vi.fn()
  render(() => <CalendarConnections onConnectionsChange={onConnectionsChange} />)

  const accountLabel = await screen.findByText('person@example.com')
  const settingsButton = screen.getByRole('button', {name: '캘린더 연결 설정'})
  const settings = screen.getByRole('dialog', {name: '캘린더 연결 설정'})

  expect(settingsButton).toHaveAttribute('aria-haspopup', 'dialog')
  expect(settingsButton).toHaveAttribute('popovertarget', settings.id)
  expect(settings).toHaveAttribute('popover', 'auto')
  expect(accountLabel).toHaveClass('text-muted-foreground')
  const disconnectButton = screen.getByRole('button', {name: 'person@example.com 연결 해제'})
  expect(disconnectButton).toHaveTextContent('Google Calendar 연결 해제')
  expect(disconnectButton).toHaveClass('rounded-panel-inner')
  expect(accountLabel.closest('button')).toBe(disconnectButton)

  const microsoftButton = screen.getByRole('button', {name: 'Microsoft Outlook 연결'})
  expect(microsoftButton).toHaveClass('rounded-panel-inner')
  fireEvent.click(microsoftButton)
  await waitFor(() =>
    expect(openCalendarAuthorization).toHaveBeenCalledWith('https://accounts.google.com/authorize'),
  )
  expect(createCalendarAuthorization).toHaveBeenCalledWith('microsoft')
})

it('should require a second press before disconnecting a calendar', async () => {
  const onConnectionsChange = vi.fn()
  render(() => <CalendarConnections onConnectionsChange={onConnectionsChange} />)

  const disconnectButton = await screen.findByRole('button', {
    name: 'person@example.com 연결 해제',
  })
  fireEvent.click(disconnectButton)

  expect(deleteCalendarConnection).not.toHaveBeenCalled()
  expect(disconnectButton).toHaveTextContent('정말 해제하시겠습니까?')
  expect(disconnectButton).toHaveTextContent('person@example.com')

  fireEvent.click(disconnectButton)
  await waitFor(() => expect(deleteCalendarConnection).toHaveBeenCalledWith('connection-1'))
  await waitFor(() => expect(onConnectionsChange).toHaveBeenCalledTimes(1))
})
