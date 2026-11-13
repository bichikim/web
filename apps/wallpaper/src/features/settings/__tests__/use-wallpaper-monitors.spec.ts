/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, expectTypeOf, it, vi} from 'vitest'
import {listWallpaperMonitors, subscribeWallpaperMonitors} from '../monitors'
import {useWallpaperMonitors} from '../use-wallpaper-monitors'

vi.mock('../monitors', () => ({
  listWallpaperMonitors: vi.fn(),
  subscribeWallpaperMonitors: vi.fn(),
}))
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(subscribeWallpaperMonitors).mockResolvedValue(vi.fn())
  vi.mocked(listWallpaperMonitors).mockResolvedValue([{id: 'first', name: 'First'}])
})
afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

it('should expose monitor selection as an ID command without returning internal state', async () => {
  vi.mocked(listWallpaperMonitors).mockResolvedValue([
    {id: 'first', name: 'First'},
    {id: 'second', name: 'Second'},
  ])
  const view = renderHook(useWallpaperMonitors)
  await waitFor(() => expect(view.result.selectedId()).toBe('first'))
  expectTypeOf(view.result.selectMonitor).toEqualTypeOf<(id: string) => void>()
  expect(view.result.selectMonitor('second')).toBeUndefined()
  expect(view.result.selectedId()).toBe('second')
  view.cleanup()
})

it('should discard an old lookup failure after a newer screen configuration succeeds', async () => {
  const initial = Promise.withResolvers<Awaited<ReturnType<typeof listWallpaperMonitors>>>()
  vi.mocked(listWallpaperMonitors).mockReturnValueOnce(initial.promise)
  const view = renderHook(useWallpaperMonitors)
  await waitFor(() => expect(listWallpaperMonitors).toHaveBeenCalledOnce())
  vi.mocked(subscribeWallpaperMonitors).mock.calls[0][0]()
  await waitFor(() => expect(view.result.selectedId()).toBe('first'))
  initial.reject(new Error('old native request failed'))
  await initial.promise.catch(() => undefined)
  await Promise.resolve()
  expect(view.result.error()).toBeNull()
  expect(view.result.monitors()).toEqual([{id: 'first', name: 'First'}])
  view.cleanup()
})

it('should clear a current lookup error after the next successful screen configuration', async () => {
  vi.mocked(listWallpaperMonitors).mockRejectedValueOnce(new Error('display service unavailable'))
  const view = renderHook(useWallpaperMonitors)
  await waitFor(() => expect(view.result.error()).toBe('화면 목록을 불러오지 못했어요.'))
  vi.mocked(subscribeWallpaperMonitors).mock.calls[0][0]()
  await waitFor(() => expect(view.result.selectedId()).toBe('first'))
  expect(view.result.error()).toBeNull()
  view.cleanup()
})

it('should retain a failed change subscription even when the initial screen read succeeds', async () => {
  vi.mocked(subscribeWallpaperMonitors).mockRejectedValueOnce(
    new Error('event registration failed'),
  )
  const view = renderHook(useWallpaperMonitors)
  await waitFor(() => expect(view.result.selectedId()).toBe('first'))
  expect(view.result.error()).toBe('화면 목록을 불러오지 못했어요.')
  view.result.dismissError()
  expect(view.result.error()).toBeNull()
  view.cleanup()
})
