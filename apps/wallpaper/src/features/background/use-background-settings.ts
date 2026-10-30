import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {createBuiltinMedia, createBuiltinSettings} from '../builtin-assets'
import type {MonitorWallpaper, PoffoPlacement} from '@winter-love/wallpaper/settings/model'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'

export const useBackgroundSettings = (
  monitorId: Accessor<string>,
  onError: (error: unknown) => void,
) => {
  const repository = createBuiltinSettings('wallpaper-settings')
  const media = createBuiltinMedia('wallpaper-media')
  const [settings, setSettings] = createSignal<MonitorWallpaper | null>(null)
  const [items, setItems] = createSignal<readonly BackgroundMedia[]>([])
  let revision = 0
  let disposed = false
  const refresh = async () => {
    const id = monitorId()
    revision += 1
    const request = revision
    const [stored, album] = await Promise.all([repository.read(), media.read()])
    if (!disposed && revision === request) {
      setSettings(stored.find((entry) => entry.monitorId === id) ?? null)
      setItems(album.items)
    }
  }
  const refreshSettings = () => {
    refresh().catch(onError)
  }
  const stopSettings = repository.subscribe(refreshSettings, onError)
  const stopMedia = media.subscribe(refreshSettings, onError)
  createEffect(refreshSettings)
  onCleanup(() => {
    disposed = true
    stopSettings()
    stopMedia()
    repository.close()
    media.close()
  })
  const movePoffo = async (placement: PoffoPlacement) => {
    const id = monitorId()
    const current = (await repository.read()).find((entry) => entry.monitorId === id)
    if (current?.content.mode === 'puppet') {
      await repository.save({...current, content: {...current.content, placement}})
    }
  }
  return {items, loadMedia: media.load, loadPuppet: repository.loadPuppet, movePoffo, settings}
}
