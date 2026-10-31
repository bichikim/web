import {beforeEach, expect, it, vi} from 'vitest'
import {invoke} from '@tauri-apps/api/core'
import {navigateBackgroundSurface} from '@winter-love/desktop-surface'
import {desktopSurfaces} from '../desktop'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn()}))
vi.mock('@winter-love/desktop-surface', () => ({
  navigateBackgroundSurface: vi.fn(),
  restoreBackgroundContent: vi.fn(),
  restoreSurface: vi.fn(),
  setBackgroundInteraction: vi.fn(),
  setBackgroundSurface: vi.fn(),
}))
beforeEach(() => vi.resetAllMocks())

it('should install website code when creating the native background window', async () => {
  vi.mocked(invoke).mockResolvedValueOnce(null).mockResolvedValueOnce('wallpaper-first')
  const customization = {css: 'body { color: red; }', scriptStart: 'window.ready = true'}
  expect(await desktopSurfaces.open('first', customization)).toBe('wallpaper-first')
  expect(invoke).toHaveBeenLastCalledWith('open_background', {customization, monitorId: 'first'})
  expect(navigateBackgroundSurface).not.toHaveBeenCalled()
  await desktopSurfaces.navigate('wallpaper-first', 'https://example.com/')
  expect(navigateBackgroundSurface).toHaveBeenCalledExactlyOnceWith({
    label: 'wallpaper-first',
    url: 'https://example.com/',
  })
})

it('should propagate window creation failures before navigation', async () => {
  vi.mocked(invoke)
    .mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error('window unavailable'))
  await expect(desktopSurfaces.open('first')).rejects.toThrow('window unavailable')
  expect(navigateBackgroundSurface).not.toHaveBeenCalled()
})
