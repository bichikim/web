import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  closeControlSurface,
  getBackgroundInteraction,
  openControlSurface,
  restoreSurface,
  setBackgroundInteraction,
  setBackgroundSurface,
  setWidgetSurface,
} from '@winter-love/desktop-surface'
import {
  applyDesktopMode,
  finishDesktopModeTransition,
  getDesktopBackgroundInteraction,
  setDesktopBackgroundInteraction,
} from '../runtime'

vi.mock('@winter-love/desktop-surface', () => ({
  closeControlSurface: vi.fn(),
  getBackgroundInteraction: vi.fn(),
  openControlSurface: vi.fn(),
  restoreSurface: vi.fn(),
  setBackgroundInteraction: vi.fn(),
  setBackgroundSurface: vi.fn(),
  setWidgetSurface: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(closeControlSurface).mockResolvedValue()
  vi.mocked(getBackgroundInteraction).mockResolvedValue('interactive')
  vi.mocked(openControlSurface).mockResolvedValue({created: true})
  vi.mocked(restoreSurface).mockResolvedValue()
  vi.mocked(setBackgroundInteraction).mockResolvedValue()
  vi.mocked(setBackgroundSurface).mockResolvedValue()
  vi.mocked(setWidgetSurface).mockResolvedValue()
})

afterEach(() => vi.clearAllMocks())

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

  it('should close controls after non-desktop transitions and expose native close failures', async () => {
    await finishDesktopModeTransition('widget')
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'controls'})

    vi.mocked(closeControlSurface).mockRejectedValueOnce(new Error('native close failed'))
    await expect(finishDesktopModeTransition('normal')).rejects.toThrow('native close failed')
  })

  it('should keep controls open in desktop mode', async () => {
    await finishDesktopModeTransition('desktop')
    expect(closeControlSurface).not.toHaveBeenCalled()
  })

  it('should apply the interactive background before opening controls', async () => {
    await applyDesktopMode('desktop')

    expect(openControlSurface).toHaveBeenCalledWith({
      height: 360,
      label: 'controls',
      path: '/desktop/controls/',
      width: 460,
    })
    expect(setBackgroundSurface).toHaveBeenCalledWith({
      interaction: 'interactive',
      label: 'background',
    })
    expect(openControlSurface).toHaveBeenCalledOnce()
    expect(vi.mocked(setBackgroundSurface).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(openControlSurface).mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    )
  })

  it('should roll back the background and controls when desktop entry fails', async () => {
    const error = new Error('native transition failed')
    vi.mocked(setBackgroundSurface).mockRejectedValue(error)

    await expect(applyDesktopMode('desktop')).rejects.toBe(error)
    expect(closeControlSurface).toHaveBeenCalledWith({label: 'controls'})
    expect(restoreSurface).toHaveBeenCalledWith({label: 'background'})
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

it('should read the active native background interaction', async () => {
  await expect(getDesktopBackgroundInteraction()).resolves.toBe('interactive')
  expect(getBackgroundInteraction).toHaveBeenCalledWith({label: 'background'})
})

it('should forward the selected background interaction to the native surface', async () => {
  await setDesktopBackgroundInteraction('interactive')

  expect(setBackgroundInteraction).toHaveBeenCalledWith({
    interaction: 'interactive',
    label: 'background',
  })
  expect(openControlSurface).toHaveBeenLastCalledWith({
    height: 360,
    label: 'controls',
    path: '/desktop/controls/',
    width: 460,
  })
})
