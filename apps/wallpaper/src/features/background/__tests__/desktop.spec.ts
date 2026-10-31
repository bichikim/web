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

it('should install website code before starting native page navigation', async () => {
  const configured = Promise.withResolvers<void>()
  vi.mocked(invoke).mockReturnValueOnce(configured.promise)
  const customization = {css: 'body { color: red; }', script: 'document.title = "custom"'}
  const navigating = desktopSurfaces.navigate(
    'wallpaper-first',
    'https://example.com/',
    customization,
  )
  expect(invoke).toHaveBeenCalledExactlyOnceWith('configure_website', {
    customization,
    label: 'wallpaper-first',
  })
  expect(navigateBackgroundSurface).not.toHaveBeenCalled()
  configured.resolve()
  await navigating
  expect(navigateBackgroundSurface).toHaveBeenCalledExactlyOnceWith({
    label: 'wallpaper-first',
    url: 'https://example.com/',
  })
})

it('should leave the current page when configuring website code fails', async () => {
  vi.mocked(invoke).mockRejectedValueOnce(new Error('window unavailable'))
  await expect(desktopSurfaces.navigate('wallpaper-first', 'https://example.com/')).rejects.toThrow(
    'window unavailable',
  )
  expect(navigateBackgroundSurface).not.toHaveBeenCalled()
})
