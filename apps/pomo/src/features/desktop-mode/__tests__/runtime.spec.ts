import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  closeControlSurface,
  openControlSurface,
  restoreSurface,
  setBackgroundSurface,
  setWidgetSurface,
} from '@winter-love/desktop-surface'
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

  it('should roll back the background and controls when desktop entry fails', async () => {
    const error = new Error('native transition failed')
    vi.mocked(setBackgroundSurface).mockRejectedValue(error)

    await expect(applyDesktopMode('desktop')).rejects.toBe(error)
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'desktop-player'})
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'desktop-pomodoro'})
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'desktop-settings'})
    expect(restoreSurface).toHaveBeenCalledWith({label: 'background'})
  })

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
