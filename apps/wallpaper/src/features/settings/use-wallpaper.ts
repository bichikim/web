import {createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import {
  createMonitorWallpaper,
  type MonitorWallpaper,
  type WallpaperContent,
} from '@winter-love/wallpaper/settings/model'
import type {PuppetAsset} from '@winter-love/wallpaper/settings/repository'
import {createBuiltinMedia, createBuiltinSettings} from '../builtin-assets'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import type {InteractionSettings} from '@winter-love/wallpaper/interaction/types'
import {listWallpaperMonitors, type WallpaperMonitor} from './monitors'
import {addAlbumFiles} from './add-album-files'
import {addPuppetFile} from './add-puppet-file'
import {createWallpaperContent} from '@winter-love/wallpaper/settings/create-wallpaper-content'
import {useOptimisticWallpapers} from './use-optimistic-wallpapers'
import {createContentChange} from './create-content-change'
import {createMediaChange} from './create-media-change'

interface MediaCollection {
  items: readonly BackgroundMedia[]
}

/** Owns local wallpaper settings and serializes operations across the management UI. */
export const useWallpaper = () => {
  const settings = createBuiltinSettings('wallpaper-settings')
  const media = createBuiltinMedia('wallpaper-media')
  const [monitors, setMonitors] = createSignal<readonly WallpaperMonitor[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const state = useOptimisticWallpapers({
    enqueue: (operation) => enqueue(operation),
    read: settings.read,
    save: settings.save,
  })
  const [collection, setCollection] = createStore<MediaCollection>({items: []})
  const [puppets, setPuppets] = createSignal<readonly PuppetAsset[]>([])
  const [error, setError] = createSignal<string | null>(null)
  const [imports, setImports] = createSignal(0)
  const busy = createMemo(() => imports() > 0)
  let disposed = false
  let revision = 0
  let pending = Promise.resolve()
  const current = createMemo(() => {
    const id = selectedId()
    return id === null
      ? null
      : (state.wallpapers().find((entry) => entry.monitorId === id) ?? createMonitorWallpaper(id))
  })
  const refresh = async () => {
    revision += 1
    const request = revision
    const [album, assets] = await Promise.all([
      media.read(),
      settings.listPuppets(),
      state.refresh(),
    ])
    if (!disposed && request === revision) {
      setCollection('items', reconcile(album.items, {key: 'id'}))
      setPuppets(assets)
    }
  }
  const report = (cause: unknown, message = '설정을 저장하지 못했어요.') => {
    if (!disposed) {
      console.error('Wallpaper operation failed', cause)
      setError(message)
    }
  }
  const enqueue = (operation: () => Promise<void>, message?: string): Promise<void> => {
    setError(null)
    pending = pending
      .then(async () => {
        if (!disposed) {
          await operation()
          await refresh()
        }
      })
      .catch((cause: unknown) => report(cause, message))
    return pending
  }
  const runImport = (operation: () => Promise<void>, message: string): Promise<void> => {
    setImports((count) => count + 1)
    return enqueue(operation, message).finally(() => {
      if (!disposed) {
        setImports((count) => count - 1)
      }
    })
  }
  onMount(() => {
    listWallpaperMonitors()
      .then((available) => {
        if (!disposed) {
          setMonitors(available)
          setSelectedId(available[0]?.id ?? null)
        }
      })
      .catch(report)
    refresh().catch(report)
  })
  const unsubscribeSettings = settings.subscribe(() => {
    refresh().catch(report)
  }, report)
  const unsubscribeMedia = media.subscribe(() => {
    refresh().catch(report)
  }, report)
  onCleanup(() => {
    disposed = true
    unsubscribeSettings()
    unsubscribeMedia()
    pending
      .finally(() => {
        settings.close()
        media.close()
      })
      .catch(report)
  })
  const update = (change: (previous: MonitorWallpaper) => MonitorWallpaper) => {
    const id = selectedId()
    if (id === null || disposed) {
      return Promise.resolve()
    }
    return state.update({apply: change, monitorId: id})
  }
  const changeMode = (mode: WallpaperContent['mode']) =>
    update((previous) => ({...previous, content: createWallpaperContent(mode)}))
  return {
    addMedia: (files: readonly File[]) => {
      const monitorId = selectedId()
      return runImport(
        () => addAlbumFiles({files, media, monitorId, settings}),
        '사진·동영상을 추가하지 못했어요.',
      )
    },
    addPuppet: (file: File) => {
      const monitorId = selectedId()
      return runImport(
        () => addPuppetFile({file, monitorId, settings}),
        'Poffo 파일을 가져오지 못했어요.',
      )
    },
    busy,
    changeMode,
    current,
    dismissError: () => setError(null),
    error,
    items: () => collection.items,
    loadMedia: media.load,
    loadPuppet: settings.loadPuppet,
    monitors,
    puppets,
    selectedId,
    selectMonitor: setSelectedId,
    setContent: (content: WallpaperContent) => {
      const before = current()?.content
      const change =
        before === undefined ? () => content : createContentChange({after: content, before})
      return update((previous) => ({...previous, content: change(previous.content)}))
    },
    setInteraction: (patch: Partial<InteractionSettings>) =>
      update((previous) => ({...previous, interaction: {...previous.interaction, ...patch}})),
    toggleMedia: (id: string) => update(createMediaChange({content: current()?.content, id})),
    wallpapers: state.wallpapers,
  }
}

export type WallpaperController = ReturnType<typeof useWallpaper>
