import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {createWallpaperContent} from '@winter-love/wallpaper/settings/create-wallpaper-content'
import {createBuiltinSettings} from '../../src/features/builtin-assets'
import {useBackgroundSettings} from '../../src/features/background/use-background-settings'

it('should receive local character and album changes from a separate settings writer', async () => {
  const base = createMonitorWallpaper(crypto.randomUUID())
  const writer = createBuiltinSettings('wallpaper-settings')
  const onError = vi.fn()
  const {cleanup, result} = renderHook(() => useBackgroundSettings(() => base.monitorId, onError))
  const readContent = () => result.settings()?.content

  try {
    await writer.save({...base, content: {assetId: 'character-a', mode: 'puppet'}})
    await expect.poll(readContent).toMatchObject({assetId: 'character-a', mode: 'puppet'})
    await writer.save({...base, content: {assetId: 'character-b', mode: 'puppet'}})
    await expect.poll(readContent).toMatchObject({assetId: 'character-b', mode: 'puppet'})

    const album = createWallpaperContent('album')
    await writer.save({...base, content: {...album, mediaIds: ['photo-a']}})
    await expect.poll(readContent).toMatchObject({mediaIds: ['photo-a'], mode: 'album'})
    await writer.save({...base, content: {...album, mediaIds: ['photo-b']}})
    await expect.poll(readContent).toMatchObject({mediaIds: ['photo-b'], mode: 'album'})
    expect(onError).not.toHaveBeenCalled()
  } finally {
    cleanup()
    writer.close()
  }
})
