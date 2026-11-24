/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {SettingsNavigationContext} from '../../features/settings-navigation'
import {SSettingsContent} from '../SSettingsContent'

afterEach(cleanup)

test('should hide and disable stale content without losing its input state', () => {
  const [pending, setPending] = createSignal(false)
  render(() => (
    <SSettingsContent pending={pending()}>
      <input aria-label="Draft" />
    </SSettingsContent>
  ))
  const input = screen.getByRole('textbox', {name: 'Draft'})
  fireEvent.input(input, {target: {value: 'unsaved'}})
  setPending(true)
  expect(input.isConnected).toBe(true)
  expect(input.closest('[aria-busy="true"]')).toHaveProperty('inert', true)
  expect(input.closest('[aria-hidden="true"]')).toHaveClass('opacity-0')
  expect(screen.queryByRole('textbox', {name: 'Draft'})).toBeNull()
  expect(screen.getByRole('status', {name: '페이지 전환 중'})).toBeInTheDocument()
  setPending(false)
  expect(screen.getByRole('textbox', {name: 'Draft'})).toBe(input)
  expect(input).toHaveValue('unsaved')
  expect(screen.queryByRole('status')).toBeNull()
})

test('should inherit pending navigation while keeping its loader outside the disabled body', () => {
  const [pending, setPending] = createSignal(false)
  const navigation = {
    active: () => true,
    attach: () => () => undefined,
    navigate: vi.fn().mockResolvedValue(undefined),
    path: () => [],
    pending,
    select: vi.fn().mockResolvedValue(undefined),
    trail: () => [],
  }
  render(() => (
    <SettingsNavigationContext.Provider value={navigation}>
      <SSettingsContent fill>
        <button>Previous page</button>
      </SSettingsContent>
    </SettingsNavigationContext.Provider>
  ))
  setPending(true)
  const status = screen.getByRole('status', {name: '페이지 전환 중'})
  expect(status.closest('[inert]')).toBeNull()
  expect(screen.queryByRole('button', {name: 'Previous page'})).toBeNull()
})
