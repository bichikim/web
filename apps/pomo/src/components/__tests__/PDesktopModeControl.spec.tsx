/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {PDesktopModeControl} from '../PDesktopModeControl'

afterEach(() => vi.unstubAllEnvs())

it('should hide desktop controls in web builds', () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')
  render(() => <PDesktopModeControl mode="normal" onModeChange={vi.fn()} />)

  expect(screen.queryByRole('group')).not.toBeInTheDocument()
})

it('should expose all modes, pending state, and transition errors', () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  const onModeChange = vi.fn().mockResolvedValue(undefined)
  const view = render(() => (
    <PDesktopModeControl
      error="native failed"
      isChanging
      mode="desktop"
      onModeChange={onModeChange}
    />
  ))

  expect(screen.getByRole('button', {name: '바탕화면'})).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', {name: '인터랙티브 바탕화면'})).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('native failed')
  expect(screen.getAllByRole('button').every((button) => button.hasAttribute('disabled'))).toBe(
    true,
  )

  view.unmount()
  render(() => <PDesktopModeControl mode="normal" onModeChange={onModeChange} />)
  fireEvent.click(screen.getByRole('button', {name: '미니 위젯'}))
  expect(onModeChange).toHaveBeenCalledWith('widget')
})
