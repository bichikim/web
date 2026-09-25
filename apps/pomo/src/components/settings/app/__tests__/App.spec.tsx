/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {App} from '../App'

vi.mock('../../../p-desktop-mode-control/PDesktopModeControl', () => ({
  PDesktopModeControl: (props: {
    readonly error?: string | null
    readonly isChanging?: boolean
    readonly mode: string
    readonly onModeChange: (mode: 'widget') => Promise<void>
  }) => (
    <button
      disabled={props.isChanging}
      onClick={() => void props.onModeChange('widget')}
      type="button"
    >
      {props.mode}: {props.error ?? 'ready'}
    </button>
  ),
}))

afterEach(() => vi.unstubAllEnvs())

it('should offer desktop mode changes from app settings', () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  const onDesktopModeChange = vi.fn().mockResolvedValue(undefined)
  render(() => <App desktopMode="normal" onDesktopModeChange={onDesktopModeChange} />)

  fireEvent.click(screen.getByRole('button', {name: 'normal: ready'}))
  expect(onDesktopModeChange).toHaveBeenCalledWith('widget')
})

it('should show transition state and error in app settings', () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  render(() => <App desktopMode="widget" desktopModeError="native failed" isDesktopModeChanging />)

  expect(screen.getByRole('button', {name: 'widget: native failed'})).toBeDisabled()
})
