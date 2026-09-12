import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  closeControlSurface,
  openControlSurface,
  restoreSurface,
  setBackgroundSurface,
  setWidgetSurface,
} from '@winter-love/desktop-surface'
import {
  DEFAULT_P_DISPLAY_PREFERENCES,
  writePDisplayPreferences,
} from '../../focus-room-display-preferences'
import {
  applyDesktopMode,
  finishDesktopModeTransition,
  prepareDesktopModeTransition,
} from '../runtime'

vi.mock('@winter-love/desktop-surface', () => ({
  closeControlSurface: vi.fn(),
  openControlSurface: vi.fn(),
  restoreSurface: vi.fn(),
  setBackgroundSurface: vi.fn(),
  setWidgetSurface: vi.fn(),
}))

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('screen', {availHeight: 900, availLeft: 0, availTop: 0, availWidth: 1440})
  vi.mocked(closeControlSurface).mockResolvedValue()
  vi.mocked(openControlSurface).mockResolvedValue({created: true})
  vi.mocked(restoreSurface).mockResolvedValue()
  vi.mocked(setBackgroundSurface).mockResolvedValue()
  vi.mocked(setWidgetSurface).mockResolvedValue()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('applyDesktopMode', () => {
  it('should restore the normal window before controller cleanup', async () => {
    await expect(applyDesktopMode('normal')).resolves.toBeUndefined()
    expect(restoreSurface).toHaveBeenCalledWith({label: 'background'})
    expect(closeControlSurface).not.toHaveBeenCalled()
  })

  it('should size the mini widget before controller cleanup', async () => {
    await applyDesktopMode('widget')

    expect(closeControlSurface).not.toHaveBeenCalled()
    expect(setWidgetSurface).toHaveBeenCalledWith({
      height: 520,
      label: 'background',
      width: 420,
    })
  })

  it('should close content before publication and settings after publication', async () => {
    await prepareDesktopModeTransition('interactiveDesktop')
    expect(closeControlSurface).toHaveBeenNthCalledWith(1, {label: 'desktop-player'})
    expect(closeControlSurface).toHaveBeenNthCalledWith(2, {label: 'desktop-pomodoro'})

    vi.mocked(closeControlSurface).mockClear()
    await finishDesktopModeTransition('widget')
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'desktop-settings'})

    vi.mocked(closeControlSurface).mockRejectedValueOnce(new Error('native close failed'))
    await expect(finishDesktopModeTransition('normal')).rejects.toThrow('native close failed')
  })

  it('should keep controls open in desktop mode', async () => {
    await prepareDesktopModeTransition('desktop')
    await finishDesktopModeTransition('desktop')
    expect(closeControlSurface).not.toHaveBeenCalled()
  })

  it('should preserve every content-surface close failure', async () => {
    vi.mocked(closeControlSurface)
      .mockRejectedValueOnce(new Error('player close failed'))
      .mockRejectedValueOnce(new Error('Pomodoro close failed'))

    const transition = prepareDesktopModeTransition('normal')
    await expect(transition).rejects.toBeInstanceOf(AggregateError)
    await expect(transition).rejects.toThrow(
      'One or more desktop control surfaces could not be closed',
    )
  })

  it('should apply a pass-through background before opening three positioned surfaces', async () => {
    await applyDesktopMode('desktop')

    expect(openControlSurface).toHaveBeenNthCalledWith(1, {
      height: 340,
      label: 'desktop-player',
      path: '/desktop/player/',
      width: 520,
      x: 24,
      y: 536,
    })
    expect(openControlSurface).toHaveBeenNthCalledWith(2, {
      height: 520,
      label: 'desktop-pomodoro',
      path: '/desktop/pomodoro/',
      width: 360,
      x: 540,
      y: 24,
    })
    expect(openControlSurface).toHaveBeenNthCalledWith(3, {
      height: 620,
      label: 'desktop-settings',
      path: '/desktop/settings/',
      width: 420,
      x: 996,
      y: 24,
    })
    expect(setBackgroundSurface).toHaveBeenCalledWith({
      interaction: 'passThrough',
      label: 'background',
    })
    expect(openControlSurface).toHaveBeenCalledTimes(3)
    expect(vi.mocked(setBackgroundSurface).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(openControlSurface).mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    )
  })

  it.each([
    {labels: ['desktop-settings'], playerVisible: false, pomodoroVisible: false},
    {labels: ['desktop-player', 'desktop-settings'], playerVisible: true, pomodoroVisible: false},
    {labels: ['desktop-pomodoro', 'desktop-settings'], playerVisible: false, pomodoroVisible: true},
  ])(
    'should open only enabled surfaces for $playerVisible / $pomodoroVisible',
    async ({playerVisible, pomodoroVisible, labels}) => {
      await writePDisplayPreferences({
        ...DEFAULT_P_DISPLAY_PREFERENCES,
        playerVisible,
        pomodoroVisible,
      })

      await applyDesktopMode('desktop')

      expect(vi.mocked(openControlSurface).mock.calls.map(([options]) => options.label)).toEqual(
        labels,
      )
    },
  )

  it('should roll back the background and controls when desktop entry fails', async () => {
    const error = new Error('native transition failed')
    vi.mocked(setBackgroundSurface).mockRejectedValue(error)

    await expect(applyDesktopMode('desktop')).rejects.toBe(error)
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'desktop-player'})
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'desktop-pomodoro'})
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'desktop-settings'})
    expect(restoreSurface).toHaveBeenCalledWith({label: 'background'})
  })

  it('should wait for delayed creation before rollback and allow a subsequent entry', async () => {
    const player = Promise.withResolvers<void>()
    const settings = Promise.withResolvers<void>()
    const windows = new Set<string>()
    const error = new Error('settings creation failed')
    vi.mocked(openControlSurface).mockImplementation(async ({label}) => {
      if (label === 'desktop-player') {
        await player.promise
      }
      if (label === 'desktop-settings') {
        await settings.promise
      }
      windows.add(label)
      return {created: true}
    })
    vi.mocked(closeControlSurface).mockImplementation(async ({label}) => {
      windows.delete(label)
    })
    const transition = applyDesktopMode('desktop')
    const outcome = transition.catch((failure: unknown) => failure)
    await vi.waitFor(() => expect(openControlSurface).toHaveBeenCalledTimes(3))
    settings.reject(error)
    // Drain the failed open and its rollback before allowing the late native creation.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    const earlyCleanup = vi.mocked(closeControlSurface).mock.calls.length
    player.resolve()
    expect(await outcome).toBe(error)
    expect(earlyCleanup).toBe(0)
    expect([...windows]).toEqual([])
    expect(restoreSurface).toHaveBeenCalledWith({label: 'background'})

    await applyDesktopMode('normal')
    await prepareDesktopModeTransition('normal')
    await finishDesktopModeTransition('normal')
    vi.mocked(openControlSurface).mockImplementation(async ({label}) => {
      windows.add(label)
      return {created: true}
    })
    await applyDesktopMode('desktop')
    expect([...windows].sort()).toEqual(['desktop-player', 'desktop-pomodoro', 'desktop-settings'])
  })

  it.each([false, true])(
    'should preserve multiple open failures with cleanup failure %s',
    async (cleanupFails) => {
      const playerError = new Error('player creation failed')
      const settingsError = new Error('settings creation failed')
      const cleanupError = new Error('player close failed')
      const restoreError = new Error('background restore failed')
      vi.mocked(openControlSurface)
        .mockRejectedValueOnce(playerError)
        .mockResolvedValueOnce({created: true})
        .mockRejectedValueOnce(settingsError)
      if (cleanupFails) {
        vi.mocked(closeControlSurface).mockRejectedValueOnce(cleanupError)
        vi.mocked(restoreSurface).mockRejectedValueOnce(restoreError)
      }
      const entryError = new AggregateError(
        [playerError, settingsError],
        'One or more desktop control surfaces could not be opened',
      )
      await expect(applyDesktopMode('desktop')).rejects.toMatchObject(
        cleanupFails
          ? {errors: [entryError, cleanupError, restoreError]}
          : {errors: [playerError, settingsError]},
      )
      expect(closeControlSurface).toHaveBeenCalledTimes(3)
      expect(restoreSurface).toHaveBeenCalledWith({label: 'background'})
    },
  )

  it('should make the desktop background interactive without opening auxiliary surfaces', async () => {
    await applyDesktopMode('interactiveDesktop')

    expect(setBackgroundSurface).toHaveBeenCalledWith({
      interaction: 'interactive',
      label: 'background',
    })
    expect(openControlSurface).not.toHaveBeenCalled()
  })

  it('should keep every initial surface inside a smaller work area', async () => {
    vi.stubGlobal('screen', {availHeight: 200, availWidth: 200})

    await applyDesktopMode('desktop')

    expect(openControlSurface).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({label: 'desktop-player', x: 0, y: 0}),
    )
    expect(openControlSurface).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({label: 'desktop-pomodoro', x: 0, y: 0}),
    )
    expect(openControlSurface).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({label: 'desktop-settings', x: 0, y: 0}),
    )
  })

  it('should preserve entry and rollback failures together', async () => {
    vi.mocked(setBackgroundSurface).mockRejectedValueOnce(new Error('native transition failed'))
    vi.mocked(closeControlSurface).mockRejectedValueOnce(new Error('native close failed'))

    const transition = applyDesktopMode('desktop')

    await expect(transition).rejects.toThrow('Desktop mode entry and rollback failed')
    await expect(transition).rejects.toBeInstanceOf(AggregateError)
    expect(restoreSurface).toHaveBeenCalledWith({label: 'background'})
  })

  it('should preserve exhaustive diagnostics for an unsupported runtime value', async () => {
    await expect(applyDesktopMode('unsupported' as never)).resolves.toBe('unsupported')
  })
})
