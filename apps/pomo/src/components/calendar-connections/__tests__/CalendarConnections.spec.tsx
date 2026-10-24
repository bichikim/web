/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {useAuth} from '../../../features/auth/AuthProvider'
import type {AuthenticationState} from '../../../features/auth/machine'
import {
  authorizeCalendarConnection,
  deleteCalendarConnection,
  listCalendarConnections,
} from '../../../features/calendar'
import {CalendarConnections} from '../CalendarConnections'

vi.mock('../../../features/calendar', () => ({
  authorizeCalendarConnection: vi.fn(),
  deleteCalendarConnection: vi.fn(),
  listCalendarConnections: vi.fn(),
}))

vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: vi.fn()}))

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    session: () => ({kind: 'authenticated', provider: 'toss'}),
    state: () => ({kind: 'authenticated', provider: 'toss'}),
  })
  vi.clearAllMocks()
  vi.mocked(listCalendarConnections).mockResolvedValue([
    {accountLabel: 'person@example.com', id: 'connection-1', provider: 'google'},
  ])
  vi.mocked(authorizeCalendarConnection).mockResolvedValue(undefined)
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
  expect(disconnectButton).toHaveClass('rounded-control')
  expect(accountLabel.closest('button')).toBe(disconnectButton)

  expect(screen.queryByRole('button', {name: 'Microsoft Outlook 연결'})).not.toBeInTheDocument()
})

it('should report a failed Google connection without offering Outlook', async () => {
  vi.mocked(listCalendarConnections).mockResolvedValue([])
  vi.mocked(authorizeCalendarConnection).mockRejectedValue(new Error('Authorization unavailable'))
  render(() => <CalendarConnections />)

  fireEvent.click(await screen.findByRole('button', {name: 'Google Calendar 연결'}))

  expect(await screen.findByRole('alert')).toHaveTextContent('캘린더 연결을 확인하지 못했습니다.')
  expect(authorizeCalendarConnection).toHaveBeenCalledExactlyOnceWith('google')
  expect(screen.queryByRole('button', {name: 'Microsoft Outlook 연결'})).not.toBeInTheDocument()
})

it('should keep the provider pending until the consent handoff finishes', async () => {
  const authorization = Promise.withResolvers<void>()
  vi.mocked(listCalendarConnections).mockResolvedValue([])
  vi.mocked(authorizeCalendarConnection).mockReturnValueOnce(authorization.promise)
  render(() => <CalendarConnections />)
  const button = await screen.findByRole('button', {name: 'Google Calendar 연결'})

  fireEvent.click(button)

  expect(authorizeCalendarConnection).toHaveBeenCalledExactlyOnceWith('google')
  expect(button).toBeDisabled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  authorization.resolve()
  await waitFor(() => expect(button).toBeEnabled())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('should clear a failed consent handoff when retrying and release pending state', async () => {
  const retry = Promise.withResolvers<void>()
  vi.mocked(listCalendarConnections).mockResolvedValue([])
  vi.mocked(authorizeCalendarConnection)
    .mockRejectedValueOnce(new Error('Authorization unavailable'))
    .mockReturnValueOnce(retry.promise)
  render(() => <CalendarConnections />)
  const button = await screen.findByRole('button', {name: 'Google Calendar 연결'})
  fireEvent.click(button)
  expect(await screen.findByRole('alert')).toHaveTextContent('캘린더 연결을 확인하지 못했습니다.')
  expect(button).toBeEnabled()

  fireEvent.click(button)

  expect(authorizeCalendarConnection).toHaveBeenCalledTimes(2)
  expect(authorizeCalendarConnection).toHaveBeenLastCalledWith('google')
  expect(button).toBeDisabled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  retry.resolve()
  await waitFor(() => expect(button).toBeEnabled())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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

it('should request login without fetching calendars when signed out', async () => {
  vi.mocked(useAuth).mockReturnValue({
    session: () => null,
    state: () => ({kind: 'anonymous'}),
  })
  render(() => <CalendarConnections />)

  expect(await screen.findByText('캘린더에 연결하기 위해 로그인하세요.')).toBeVisible()
  expect(listCalendarConnections).not.toHaveBeenCalled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('should load after login and restore the login notice after logout', async () => {
  const [state, setState] = createSignal<AuthenticationState>({kind: 'anonymous'})
  vi.mocked(useAuth).mockReturnValue({
    session: () => {
      const current = state()
      return current.kind === 'authenticated' ? current : null
    },
    state,
  })
  render(() => <CalendarConnections />)
  expect(screen.getByText('캘린더에 연결하기 위해 로그인하세요.')).toBeVisible()

  setState({kind: 'authenticated', provider: 'toss'})
  await waitFor(() => expect(listCalendarConnections).toHaveBeenCalledTimes(1))
  expect(await screen.findByText('person@example.com')).toBeVisible()
  expect(screen.queryByText('캘린더에 연결하기 위해 로그인하세요.')).not.toBeInTheDocument()

  setState({kind: 'anonymous'})
  expect(await screen.findByText('캘린더에 연결하기 위해 로그인하세요.')).toBeVisible()
  expect(screen.queryByText('person@example.com')).not.toBeInTheDocument()
})

it('should reload connections when the authenticated email account changes', async () => {
  const [state, setState] = createSignal<AuthenticationState>({
    email: 'first@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  vi.mocked(useAuth).mockReturnValue({
    session: () => {
      const current = state()
      return current.kind === 'authenticated' ? current : null
    },
    state,
  })
  render(() => <CalendarConnections />)
  expect(await screen.findByText('person@example.com')).toBeVisible()
  vi.mocked(listCalendarConnections).mockResolvedValue([
    {accountLabel: 'second-calendar@example.com', id: 'connection-2', provider: 'google'},
  ])

  setState({email: 'second@example.com', kind: 'authenticated', provider: 'email'})

  expect(await screen.findByText('second-calendar@example.com')).toBeVisible()
  expect(screen.queryByText('person@example.com')).not.toBeInTheDocument()
  expect(listCalendarConnections).toHaveBeenCalledTimes(2)
})
