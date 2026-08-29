/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

vi.mock('../../components/desktop-surface/Player', () => ({
  DesktopPlayer: () => <p>desktop player page</p>,
}))
vi.mock('../../components/desktop-surface/Pomodoro', () => ({
  DesktopPomodoro: () => <p>desktop Pomodoro page</p>,
}))
vi.mock('../../components/desktop-surface/Settings', () => ({
  DesktopSettings: () => <p>desktop settings page</p>,
}))

it('should expose every dedicated desktop surface route', async () => {
  const [{default: PlayerPage}, {default: PomodoroPage}, {default: SettingsPage}] =
    await Promise.all([
      import('../desktop/player'),
      import('../desktop/pomodoro'),
      import('../desktop/settings'),
    ])

  render(() => (
    <>
      <PlayerPage />
      <PomodoroPage />
      <SettingsPage />
    </>
  ))

  expect(screen.getByText('desktop player page')).toBeInTheDocument()
  expect(screen.getByText('desktop Pomodoro page')).toBeInTheDocument()
  expect(screen.getByText('desktop settings page')).toBeInTheDocument()
})
