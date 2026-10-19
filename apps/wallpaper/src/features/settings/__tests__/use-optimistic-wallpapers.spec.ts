/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {createMonitorWallpaper, type MonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {useOptimisticWallpapers} from '../use-optimistic-wallpapers'

it('should ignore a refresh started during a pending write when it finishes after commit', async () => {
  const original = createMonitorWallpaper('monitor')
  const stale = Promise.withResolvers<readonly MonitorWallpaper[]>()
  const write = Promise.withResolvers<void>()
  const read = vi.fn(async (): Promise<readonly MonitorWallpaper[]> => [original])
  const {result, cleanup} = renderHook(() =>
    useOptimisticWallpapers({
      enqueue: (operation) => operation(),
      read,
      save: () => write.promise,
    }),
  )
  await result.refresh()
  const saving = result.update({
    apply: (previous) => ({
      ...previous,
      interaction: {...previous.interaction, activation: 'always'},
    }),
    monitorId: 'monitor',
  })
  read.mockReturnValueOnce(stale.promise)
  const refreshing = result.refresh()
  expect(result.wallpapers()[0]?.interaction.activation).toBe('always')
  write.resolve()
  await saving
  stale.resolve([original])
  await refreshing
  expect(result.wallpapers()[0]?.interaction.activation).toBe('always')
  cleanup()
})
