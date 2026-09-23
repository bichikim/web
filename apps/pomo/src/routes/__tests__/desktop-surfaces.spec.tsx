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
vi.mock('../../components/desktop-dialog/Pomodoro', () => ({
  DesktopPomodoroDialog: () => <p>desktop Pomodoro dialog page</p>,
}))
vi.mock('../../components/desktop-dialog/MemoryAssist', () => ({
  DesktopMemoryAssistDialog: () => <p>desktop memory assist dialog page</p>,
}))
vi.mock('../../components/desktop-dialog/Settings', () => ({
  DesktopSettingsDialog: () => <p>desktop settings dialog page</p>,
}))
vi.mock('../../components/desktop-dialog/Tools', () => ({
  DesktopToolsDialog: () => <p>desktop tools dialog page</p>,
}))
vi.mock('../../components/desktop-dialog/VersionNotice', () => ({
  DesktopVersionNoticeDialog: () => <p>desktop version notice dialog page</p>,
}))

it('should expose every dedicated desktop surface and dialog route', async () => {
  const [
    {default: PlayerPage},
    {default: PomodoroPage},
    {default: SettingsPage},
    {default: MemoryAssistDialogPage},
    {default: PomodoroDialogPage},
    {default: SettingsDialogPage},
    {default: ToolsDialogPage},
    {default: VersionNoticeDialogPage},
  ] = await Promise.all([
    import('../desktop/player'),
    import('../desktop/pomodoro'),
    import('../desktop/settings'),
    import('../desktop/dialog/memory-assist'),
    import('../desktop/dialog/pomodoro'),
    import('../desktop/dialog/settings'),
    import('../desktop/dialog/tools'),
    import('../desktop/dialog/version-notice'),
  ])

  render(() => (
    <>
      <PlayerPage />
      <PomodoroPage />
      <SettingsPage />
      <MemoryAssistDialogPage />
      <PomodoroDialogPage />
      <SettingsDialogPage />
      <ToolsDialogPage />
      <VersionNoticeDialogPage />
    </>
  ))

  expect(screen.getByText('desktop player page')).toBeInTheDocument()
  expect(screen.getByText('desktop Pomodoro page')).toBeInTheDocument()
  expect(screen.getByText('desktop settings page')).toBeInTheDocument()
  expect(screen.getByText('desktop memory assist dialog page')).toBeInTheDocument()
  expect(screen.getByText('desktop Pomodoro dialog page')).toBeInTheDocument()
  expect(screen.getByText('desktop settings dialog page')).toBeInTheDocument()
  expect(screen.getByText('desktop tools dialog page')).toBeInTheDocument()
  expect(screen.getByText('desktop version notice dialog page')).toBeInTheDocument()
})
