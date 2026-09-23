import {containsMedia, hashMedia} from './content'
import {prepareVideoBackground, removeVideoBackground} from '../video-background'
import {
  type BackgroundRepository,
  type BackgroundSnapshot,
  backgroundSnapshotSchema,
  DEFAULT_BACKGROUND,
} from './model'
import {createSerialTaskQueue, type SerialTaskQueue} from 'src/utils/create-serial-task-queue'

const STORAGE_KEY = 'pomo:background:v1'
const CACHE_NAME = 'pomo-background-v1'

export interface NativeBackgroundStorage {
  readonly getItem: (key: string) => Promise<string | null>
  readonly setItem: (key: string, value: string) => Promise<void>
}

export interface NativeBackgroundCache {
  readonly delete: (request: RequestInfo | URL) => Promise<boolean>
  readonly match: (request: RequestInfo | URL) => Promise<Response | undefined>
  readonly put: (request: RequestInfo | URL, response: Response) => Promise<void>
}

export interface CreateNativeRepositoryOptions {
  readonly cache?: NativeBackgroundCache
  readonly coordinator?: SerialTaskQueue
  readonly mediaUrl?: (id: string) => string
  readonly storage?: NativeBackgroundStorage
}

const defaultNativeStorageCoordinator = createSerialTaskQueue()
const injectedStorageCoordinators = new WeakMap<NativeBackgroundStorage, SerialTaskQueue>()

const getInjectedNativeStorageCoordinator = (storage: NativeBackgroundStorage): SerialTaskQueue => {
  const existingCoordinator = injectedStorageCoordinators.get(storage)
  if (existingCoordinator !== undefined) {
    return existingCoordinator
  }

  const createdCoordinator = createSerialTaskQueue()
  injectedStorageCoordinators.set(storage, createdCoordinator)
  return createdCoordinator
}

const getDefaultStorage = async (): Promise<NativeBackgroundStorage> => {
  const {Storage} = await import('@apps-in-toss/web-framework')
  return {
    getItem: (key) => Storage.getItem(key),
    setItem: (key, value) => Storage.setItem(key, value),
  }
}

const getDefaultCache = (): Promise<NativeBackgroundCache> => globalThis.caches.open(CACHE_NAME)

const getDefaultMediaUrl = (id: string) =>
  new URL(`/__pomo_background__/${id}`, location.origin).href

/** Stores the native manifest in SDK Storage and media bytes in the WebView Cache API. */
export const createNativeRepository = (
  options: CreateNativeRepositoryOptions = {},
): BackgroundRepository => {
  const listeners = new Set<() => void>()
  const coordinator =
    options.coordinator ??
    (options.storage === undefined
      ? defaultNativeStorageCoordinator
      : getInjectedNativeStorageCoordinator(options.storage))
  const getMediaUrl = options.mediaUrl ?? getDefaultMediaUrl
  const read = async (): Promise<BackgroundSnapshot> => {
    const {storage} = options
    if (storage !== undefined) {
      const value = await storage.getItem(STORAGE_KEY)
      return value === null
        ? {items: [], preferences: DEFAULT_BACKGROUND}
        : backgroundSnapshotSchema.parse(JSON.parse(value))
    }
    const defaultStorage = await getDefaultStorage()
    const value = await defaultStorage.getItem(STORAGE_KEY)
    return value === null
      ? {items: [], preferences: DEFAULT_BACKGROUND}
      : backgroundSnapshotSchema.parse(JSON.parse(value))
  }
  const write = async (snapshot: BackgroundSnapshot) => {
    const value = JSON.stringify(backgroundSnapshotSchema.parse(snapshot))
    const {storage} = options
    if (storage === undefined) {
      const defaultStorage = await getDefaultStorage()
      await defaultStorage.setItem(STORAGE_KEY, value)
    } else {
      await storage.setItem(STORAGE_KEY, value)
    }
    listeners.forEach((refresh) => refresh())
  }
  const mutate = (operation: () => Promise<void>) => coordinator.run(operation)
  return {
    add: (file, kind) =>
      mutate(async () => {
        const snapshot = await read()
        const cache = options.cache ?? (await getDefaultCache())
        const contentHash = await hashMedia(file)
        const duplicate = await containsMedia({
          hash: contentHash,
          items: snapshot.items,
          load: async (id) => {
            const response = await cache.match(getMediaUrl(id))
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
        await cache.put(getMediaUrl(id), new Response(file, {headers: {'Content-Type': file.type}}))
        try {
          await write({
            ...snapshot,
            items: [...snapshot.items, {contentHash, id, kind, name: file.name, size: file.size}],
          })
        } catch (error) {
          await cache.delete(getMediaUrl(id))
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
      const cache = options.cache ?? (await getDefaultCache())
      const response = await cache.match(getMediaUrl(id))
      if (response === undefined) {
        throw new Error('Background media is missing from the cache.')
      }
      return response.blob()
    },
    read,
    remove: (id) =>
      mutate(async () => {
        const snapshot = await read()
        const cache = options.cache ?? (await getDefaultCache())
        const url = getMediaUrl(id)
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
