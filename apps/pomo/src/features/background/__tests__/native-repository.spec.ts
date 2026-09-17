import {webcrypto} from 'node:crypto'
import {DEFAULT_BACKGROUND} from '../model'
/** @vitest-environment jsdom */
import {Storage} from '@apps-in-toss/web-framework'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  createNativeRepository,
  type NativeBackgroundCache,
  type NativeBackgroundStorage,
} from '../native-repository'

vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem: vi.fn(), setItem: vi.fn()}}))
let manifest: string | null
const entries = new Map<string, Response>()
const cache = {delete: vi.fn(), match: vi.fn(), put: vi.fn()}

const createBackend = () => {
  let manifest: string | null = null
  const entries = new Map<string, Response>()
  const storage: NativeBackgroundStorage = {
    getItem: vi.fn(async () => manifest),
    setItem: vi.fn(async (_key, value) => {
      manifest = value
    }),
  }
  const cache: NativeBackgroundCache = {
    delete: vi.fn(async (request) => entries.delete(String(request))),
    match: vi.fn(async (request) => entries.get(String(request))?.clone()),
    put: vi.fn(async (request, response) => {
      entries.set(String(request), response.clone())
    }),
  }
  return {cache, entries, mediaUrl: (id: string) => `https://backend.test/${id}`, storage}
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('crypto', webcrypto)
  manifest = null
  entries.clear()
  vi.mocked(Storage.getItem).mockImplementation(async () => manifest)
  vi.mocked(Storage.setItem).mockImplementation(async (_key, value) => {
    manifest = value
  })
  cache.put.mockImplementation(async (url: string, response: Response) => {
    entries.set(url, response)
  })
  cache.match.mockImplementation(async (url: string) => entries.get(url)?.clone())
  cache.delete.mockImplementation(async (url: string) => entries.delete(url))
  vi.stubGlobal('caches', {open: vi.fn(async () => cache)})
})
afterEach(() => vi.unstubAllGlobals())

it('should serialize manifest changes and restore the list in a new repository', async () => {
  const repository = createNativeRepository()
  const refresh = vi.fn()
  const unsubscribe = repository.subscribe(refresh, vi.fn())
  await Promise.all([
    repository.add(new File(['a'], 'one.jpg', {type: 'image/jpeg'}), 'photo'),
    repository.add(new File(['b'], 'two.mp4', {type: 'video/mp4'}), 'video'),
    repository.configure({mode: 'frame', order: 'random'}),
  ])
  const restored = await createNativeRepository().read()
  expect(restored.items.map((item) => item.name)).toEqual(['one.jpg', 'two.mp4'])
  expect(restored.preferences).toMatchObject({mode: 'frame', order: 'random'})
  expect(refresh).toHaveBeenCalledTimes(3)
  unsubscribe()
  await repository.configure({photoSeconds: 30})
  expect(refresh).toHaveBeenCalledTimes(3)
})

it('should roll back cached bytes if manifest saving fails and accept the next operation', async () => {
  const repository = createNativeRepository()
  vi.mocked(Storage.setItem).mockRejectedValueOnce(new Error('storage failed'))
  await expect(
    repository.add(new File(['a'], 'one.jpg', {type: 'image/jpeg'}), 'photo'),
  ).rejects.toThrow('storage failed')
  expect(entries.size).toBe(0)
  expect((await repository.read()).items).toEqual([])
  await repository.add(new File(['b'], 'two.jpg', {type: 'image/jpeg'}), 'photo')
  expect((await repository.read()).items).toHaveLength(1)
})

it('should delete bytes and metadata and reject missing media', async () => {
  const repository = createNativeRepository()
  await repository.add(new File(['a'], 'one.jpg', {type: 'image/jpeg'}), 'photo')
  const item = (await repository.read()).items[0]!
  await repository.remove(item.id)
  expect(entries.size).toBe(0)
  expect((await repository.read()).items).toEqual([])
  await expect(repository.load(item.id)).rejects.toThrow('missing')
})

it('should restore cached media when deleting its manifest entry fails', async () => {
  const repository = createNativeRepository()
  await repository.add(new File(['a'], 'one.jpg', {type: 'image/jpeg'}), 'photo')
  const item = (await repository.read()).items[0]!
  vi.mocked(Storage.setItem).mockRejectedValueOnce(new Error('storage failed'))
  await expect(repository.remove(item.id)).rejects.toThrow('storage failed')
  expect((await repository.read()).items).toHaveLength(1)
  expect(entries.size).toBe(1)
})

it('should default legacy albums to single photos and persist the pair preference', async () => {
  manifest = JSON.stringify({
    items: [],
    preferences: {mode: 'frame', order: 'sequential', photoSeconds: 10},
  })
  const repository = createNativeRepository()
  expect((await repository.read()).preferences.pairPhotos).toBe(false)
  await repository.configure({pairPhotos: true})
  expect((await createNativeRepository().read()).preferences.pairPhotos).toBe(true)
})

it('should default old preferences to fade and persist disabling transitions', async () => {
  manifest = JSON.stringify({
    items: [],
    preferences: {mode: 'frame', order: 'sequential', photoSeconds: 10},
  })
  const repository = createNativeRepository()
  expect((await repository.read()).preferences.transition).toBe('fade')
  await repository.configure({transition: 'none'})
  expect((await createNativeRepository().read()).preferences.transition).toBe('none')
})

it('should restore legacy random settings and persist an enabled effect pool', async () => {
  manifest = JSON.stringify({
    items: [],
    preferences: {mode: 'frame', order: 'sequential', photoSeconds: 10},
  })
  const repository = createNativeRepository()
  expect((await repository.read()).preferences.randomTransitions).toBe(false)
  await repository.configure({
    randomTransitions: true,
    transitionPool: ['cross-warp', 'circle-open'],
  })
  const preferences = (await createNativeRepository().read()).preferences
  expect(preferences.randomTransitions).toBe(true)
  expect(preferences.transitionPool).toEqual(['cross-warp', 'circle-open'])
})

it('should migrate removed water effects without losing saved media or other effects', async () => {
  manifest = JSON.stringify({
    items: [],
    preferences: {
      ...DEFAULT_BACKGROUND,
      transition: 'water-drop',
      transitionPool: ['water-drop', 'circle-open'],
    },
  })
  const repository = createNativeRepository()
  expect((await repository.read()).preferences).toMatchObject({
    transition: 'fade',
    transitionPool: ['circle-open'],
  })
  manifest = JSON.stringify({
    items: [],
    preferences: {...DEFAULT_BACKGROUND, transitionPool: ['water-drop']},
  })
  expect((await createNativeRepository().read()).preferences.transitionPool).toEqual(['fade'])
})

it('should ignore identical content with another name across adds and repository reloads', async () => {
  const repository = createNativeRepository()
  await repository.add(new File(['same'], 'one.png', {type: 'image/png'}), 'photo')
  await repository.add(new File(['same'], 'renamed.png', {type: 'image/png'}), 'photo')
  await createNativeRepository().add(new File(['same'], 'again.png', {type: 'image/png'}), 'photo')
  expect((await repository.read()).items).toHaveLength(1)
  await repository.add(new File(['diff'], 'one.png', {type: 'image/png'}), 'photo')
  expect((await repository.read()).items).toHaveLength(2)
})
it('should recognize content already stored before hashes were introduced', async () => {
  const repository = createNativeRepository()
  await repository.add(new File(['legacy'], 'old.png', {type: 'image/png'}), 'photo')
  const snapshot = JSON.parse(manifest!)
  delete snapshot.items[0].contentHash
  manifest = JSON.stringify(snapshot)
  cache.match.mockResolvedValueOnce({
    blob: async () => new File(['legacy'], 'old.png', {type: 'image/png'}),
  })
  await repository.add(new File(['legacy'], 'new.png', {type: 'image/png'}), 'photo')
  expect((await repository.read()).items).toHaveLength(1)
})

it('should serialize duplicate checks across repository instances', async () => {
  await Promise.all(
    [createNativeRepository(), createNativeRepository()].map((repository) =>
      repository.add(new File(['same'], 'photo.png', {type: 'image/png'}), 'photo'),
    ),
  )
  expect((await createNativeRepository().read()).items).toHaveLength(1)
})

it('should share the default coordinator when only the media URL is injected', async () => {
  let releaseFirstPut: (() => void) | undefined
  let putCount = 0
  cache.put.mockImplementation(async (url: string, response: Response) => {
    entries.set(url, response)
    putCount += 1
    if (putCount === 1) {
      await new Promise<void>((resolve) => {
        releaseFirstPut = resolve
      })
    }
  })
  const firstRepository = createNativeRepository({
    mediaUrl: (id) => `https://default.test/${id}`,
  })
  const secondRepository = createNativeRepository({
    mediaUrl: (id) => `https://default.test/${id}`,
  })

  const firstAdd = firstRepository.add(new File(['first'], 'first.jpg'), 'photo')
  await vi.waitFor(() => expect(cache.put).toHaveBeenCalledOnce())
  const secondAdd = secondRepository.add(new File(['second'], 'second.jpg'), 'photo')

  expect(cache.put).toHaveBeenCalledOnce()
  releaseFirstPut?.()
  await Promise.all([firstAdd, secondAdd])
  expect(cache.put).toHaveBeenCalledTimes(2)
})

it('should share the default coordinator when only the cache is injected', async () => {
  let releaseFirstPut: (() => void) | undefined
  let putCount = 0
  const backend = createBackend()
  vi.mocked(backend.cache.put).mockImplementation(async (request, response) => {
    backend.entries.set(String(request), response.clone())
    putCount += 1
    if (putCount === 1) {
      await new Promise<void>((resolve) => {
        releaseFirstPut = resolve
      })
    }
  })
  const firstRepository = createNativeRepository({cache: backend.cache})
  const secondRepository = createNativeRepository({cache: backend.cache})

  const firstAdd = firstRepository.add(new File(['first'], 'first.jpg'), 'photo')
  await vi.waitFor(() => expect(backend.cache.put).toHaveBeenCalledOnce())
  const secondAdd = secondRepository.add(new File(['second'], 'second.jpg'), 'photo')

  expect(backend.cache.put).toHaveBeenCalledOnce()
  releaseFirstPut?.()
  await Promise.all([firstAdd, secondAdd])
  expect(backend.cache.put).toHaveBeenCalledTimes(2)
})

it('should not assimilate the SDK Storage proxy as a promise', async () => {
  Object.defineProperty(Storage, 'then', {
    configurable: true,
    get: () => {
      throw new Error('Storage.then is not mocked')
    },
  })

  try {
    await expect(createNativeRepository().read()).resolves.toEqual({
      items: [],
      preferences: DEFAULT_BACKGROUND,
    })
  } finally {
    Reflect.deleteProperty(Storage, 'then')
  }
})

it('should keep custom native backends independently writable', async () => {
  let releaseFirstPut: (() => void) | undefined
  const firstBackend = createBackend()
  const secondBackend = createBackend()
  vi.mocked(firstBackend.cache.put).mockImplementationOnce(async (request, response) => {
    firstBackend.entries.set(String(request), response.clone())
    await new Promise<void>((resolve) => {
      releaseFirstPut = resolve
    })
  })
  const firstRepository = createNativeRepository(firstBackend)
  const secondRepository = createNativeRepository(secondBackend)

  const firstAdd = firstRepository.add(new File(['first'], 'first.jpg'), 'photo')
  await vi.waitFor(() => expect(firstBackend.cache.put).toHaveBeenCalledOnce())
  const secondAdd = secondRepository.add(new File(['second'], 'second.jpg'), 'photo')

  await expect(secondAdd).resolves.toBeUndefined()
  expect(secondBackend.storage.setItem).toHaveBeenCalledOnce()
  releaseFirstPut?.()
  await expect(firstAdd).resolves.toBeUndefined()
})

it('should share coordination for repositories using the same injected manifest storage', async () => {
  let releaseFirstPut: (() => void) | undefined
  const firstBackend = createBackend()
  const secondBackend = createBackend()
  vi.mocked(firstBackend.cache.put).mockImplementationOnce(async (request, response) => {
    firstBackend.entries.set(String(request), response.clone())
    await new Promise<void>((resolve) => {
      releaseFirstPut = resolve
    })
  })
  const firstRepository = createNativeRepository(firstBackend)
  const secondRepository = createNativeRepository({
    cache: secondBackend.cache,
    mediaUrl: secondBackend.mediaUrl,
    storage: firstBackend.storage,
  })

  const firstAdd = firstRepository.add(new File(['first'], 'first.jpg'), 'photo')
  await vi.waitFor(() => expect(firstBackend.cache.put).toHaveBeenCalledOnce())
  const secondAdd = secondRepository.add(new File(['second'], 'second.jpg'), 'photo')

  expect(secondBackend.cache.put).not.toHaveBeenCalled()
  releaseFirstPut?.()
  await Promise.all([firstAdd, secondAdd])
})
