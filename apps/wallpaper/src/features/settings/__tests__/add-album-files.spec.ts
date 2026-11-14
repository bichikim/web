import {expect, it, vi} from 'vitest'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {DEFAULT_BACKGROUND, type MediaImportRepository} from '@winter-love/wallpaper/model'
import type {SettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {addAlbumFiles} from '../add-album-files'

it('should add imported media to the selected monitor album without losing its earlier selection', async () => {
  const current = {
    ...createMonitorWallpaper('first'),
    content: {
      mediaIds: ['old'],
      mode: 'album' as const,
      order: 'random' as const,
      photoSeconds: 15,
      transition: 'fade' as const,
      videoMode: 'end' as const,
    },
  }
  const old = {id: 'old', kind: 'photo' as const, name: 'old.png', size: 1}
  const added = {id: 'new', kind: 'photo' as const, name: 'new.png', size: 1}
  const media: MediaImportRepository = {
    add: vi.fn(),
    configure: vi.fn(),
    importMedia: vi.fn(async () => 'new'),
    load: vi.fn(),
    read: vi
      .fn()
      .mockResolvedValueOnce({items: [old], preferences: DEFAULT_BACKGROUND})
      .mockResolvedValueOnce({items: [old, added], preferences: DEFAULT_BACKGROUND}),
    remove: vi.fn(),
    subscribe: vi.fn(),
  }
  const settings: SettingsRepository = {
    addPuppet: vi.fn(),
    close: vi.fn(),
    listPuppets: vi.fn(),
    loadPuppet: vi.fn(),
    read: vi.fn(async () => [current]),
    removeMediaReferences: vi.fn(),
    removePuppet: vi.fn(),
    save: vi.fn(),
    subscribe: vi.fn(),
  }
  await addAlbumFiles({
    files: [new File(['x'], 'new.png', {type: 'image/png'})],
    media,
    monitorId: 'first',
    settings,
  })
  expect(settings.save).toHaveBeenCalledWith({
    ...current,
    content: {...current.content, mediaIds: ['old', 'new']},
  })
})
