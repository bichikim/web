/** @vitest-environment jsdom */
import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {afterEach, expect, it, vi} from 'vitest'
import {listWallpaperMonitors, subscribeWallpaperMonitors} from '../monitors'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/event', () => ({listen: vi.fn()}))
afterEach(() => vi.resetAllMocks())

it('should refresh from native screen notifications and expose subscription cleanup', async () => {
  const stop = vi.fn()
  const refresh = vi.fn()
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(listen).mockResolvedValue(stop)
  const unsubscribe = await subscribeWallpaperMonitors(refresh)
  expect(listen).toHaveBeenCalledWith('desktop-surface-monitors-changed', refresh)
  vi.mocked(listen).mock.calls[0][1]({
    event: 'desktop-surface-monitors-changed',
    id: 1,
    payload: null,
  })
  expect(refresh).toHaveBeenCalledOnce()
  unsubscribe()
  expect(stop).toHaveBeenCalledOnce()
})

it('should list current native monitors instead of caching an earlier configuration', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke)
    .mockResolvedValueOnce([{id: 'first', name: 'First'}])
    .mockResolvedValueOnce([
      {id: 'first', name: 'First'},
      {id: 'second', name: 'Second'},
    ])
  expect(await listWallpaperMonitors()).toHaveLength(1)
  expect(await listWallpaperMonitors()).toHaveLength(2)
  expect(invoke).toHaveBeenLastCalledWith('list_wallpaper_monitors')
})

it('should retain the browser preview without accessing native events', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  expect(await listWallpaperMonitors()).toEqual([{id: 'browser-preview', name: '미리보기 화면'}])
  const stop = await subscribeWallpaperMonitors(vi.fn())
  stop()
  expect(invoke).not.toHaveBeenCalled()
  expect(listen).not.toHaveBeenCalled()
})
