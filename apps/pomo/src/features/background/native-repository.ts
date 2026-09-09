import {containsMedia, hashMedia} from './content'
import {prepareVideoBackground, removeVideoBackground} from '../video-background'
import {
  type BackgroundRepository,
  type BackgroundSnapshot,
  backgroundSnapshotSchema,
  DEFAULT_BACKGROUND,
} from './model'

const STORAGE_KEY = 'pomo:background:v1'
const CACHE_NAME = 'pomo-background-v1'
let queue = Promise.resolve()

const mediaUrl = (id: string) => new URL(`/__pomo_background__/${id}`, location.origin).href

/** Stores the native manifest in SDK Storage and media bytes in the WebView Cache API. */
export const createNativeRepository = (): BackgroundRepository => {
  const listeners = new Set<() => void>()
  const read = async (): Promise<BackgroundSnapshot> => {
    const {Storage} = await import('@apps-in-toss/web-framework')
    const value = await Storage.getItem(STORAGE_KEY)
    return value === null
      ? {items: [], preferences: DEFAULT_BACKGROUND}
      : backgroundSnapshotSchema.parse(JSON.parse(value))
  }
  const write = async (snapshot: BackgroundSnapshot) => {
    const {Storage} = await import('@apps-in-toss/web-framework')
    await Storage.setItem(STORAGE_KEY, JSON.stringify(backgroundSnapshotSchema.parse(snapshot)))
    listeners.forEach((refresh) => refresh())
  }
  const mutate = (operation: () => Promise<void>) => {
    const result = queue.then(operation)
    queue = result.catch(() => undefined)
    return result
  }
  return {
    add: (file, kind) =>
      mutate(async () => {
        const snapshot = await read()
        const cache = await caches.open(CACHE_NAME)
        const contentHash = await hashMedia(file)
        const duplicate = await containsMedia({
          hash: contentHash,
          items: snapshot.items,
          load: async (id) => {
            const response = await cache.match(mediaUrl(id))
            if (response === undefined) {
              throw new Error('Background media is missing from the cache.')
            }
            return response.blob()
          },
          size: file.size,
        })
        if (duplicate) {
          return
        }
        const id = crypto.randomUUID()
        await cache.put(mediaUrl(id), new Response(file, {headers: {'Content-Type': file.type}}))
        try {
          await write({
            ...snapshot,
            items: [...snapshot.items, {contentHash, id, kind, name: file.name, size: file.size}],
          })
        } catch (error) {
          await cache.delete(mediaUrl(id))
          throw error
        }
        if (kind === 'video') {
          prepareVideoBackground(id, file)
        }
      }),
    configure: (patch) =>
      mutate(async () => {
        const snapshot = await read()
        await write({...snapshot, preferences: {...snapshot.preferences, ...patch}})
      }),
    async load(id) {
      const cache = await caches.open(CACHE_NAME)
      const response = await cache.match(mediaUrl(id))
      if (response === undefined) {
        throw new Error('Background media is missing from the cache.')
      }
      return response.blob()
    },
    read,
    remove: (id) =>
      mutate(async () => {
        const snapshot = await read()
        const cache = await caches.open(CACHE_NAME)
        const url = mediaUrl(id)
        const previous = await cache.match(url)
        await cache.delete(url)
        try {
          await write({...snapshot, items: snapshot.items.filter((item) => item.id !== id)})
        } catch (error) {
          // Preserve the file when its manifest deletion cannot be committed.
          if (previous !== undefined) {
            await cache.put(url, previous)
          }
          throw error
        }
        await removeVideoBackground(id)
      }),
    subscribe(refresh) {
      listeners.add(refresh)
      return () => listeners.delete(refresh)
    },
  }
}
