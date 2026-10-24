/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {CalendarProviderActions} from '../ProviderActions'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should offer connecting only the requested provider when no account is linked', () => {
  const onConnect = vi.fn()
  render(() => (
    <CalendarProviderActions
      connections={[]}
      confirmingId={null}
      onConnect={onConnect}
      onDisconnect={vi.fn()}
      pending={false}
      provider="google"
    />
  ))
  fireEvent.click(screen.getByRole('button'))
  expect(onConnect).toHaveBeenCalledWith('google')
})
it('should forward the connected account for disconnection and disable pending actions', () => {
  const connection = {accountLabel: 'test@example.com', id: 'google', provider: 'google' as const}
  const onDisconnect = vi.fn()
  const [pending, setPending] = createSignal(false)
  render(() => (
    <CalendarProviderActions
      connections={[connection]}
      confirmingId="google"
      onConnect={vi.fn()}
      onDisconnect={onDisconnect}
      pending={pending()}
      provider="google"
    />
  ))
  const button = screen.getByRole('button')
  fireEvent.click(button)
  expect(onDisconnect).toHaveBeenCalledWith(connection)
  setPending(true)
  expect(button).toBeDisabled()
})
