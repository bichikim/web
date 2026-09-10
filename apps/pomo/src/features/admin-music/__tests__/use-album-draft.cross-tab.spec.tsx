/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'

import Dexie from 'dexie'
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn((clientAction) => clientAction),
  useSubmission: vi.fn(() => ({clear: vi.fn(), pending: false})),
}))

import {createEmptyAlbumTranslations} from '../album-draft'
import {readAlbumDraftCover, writeAlbumDraftData} from '../album-draft-storage'
import {useAlbumDraft} from '../use-album-draft'

const createSessionStorage = (): Storage => {
  const values = new Map<string, string>()

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

const replaceSessionStorage = (storage: Storage): void => {
  Object.defineProperty(globalThis, 'sessionStorage', {configurable: true, value: storage})
}

const originalSessionStorage = globalThis.sessionStorage

afterEach(() => {
  replaceSessionStorage(originalSessionStorage)
  vi.restoreAllMocks()
})

it('should retain an expired cover referenced by another open tab session', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 8, 10))
  const firstTabStorage = createSessionStorage()
  const secondTabStorage = createSessionStorage()
  const coverId = 'first-tab-active-cover'
  const database = new Dexie('pomo-admin-music-draft')
  database.version(2).stores({covers: 'id, updatedAt'})
  const covers = database.table<{blob: Blob; id: string; updatedAt: number}>('covers')
  const firstTabCover = new File(['first-tab'], 'cover.webp', {type: 'image/webp'})

  replaceSessionStorage(firstTabStorage)
  const firstTabDraft = {
    albumId: '00000000-0000-4000-8000-000000000002',
    coverDraftId: coverId,
    coverFallback: 'lp' as const,
    coverImageUrl: '',
    hasCoverFile: true,
    translations: createEmptyAlbumTranslations(),
  }
  writeAlbumDraftData(firstTabDraft)
  await covers.put({
    blob: firstTabCover,
    id: coverId,
    updatedAt: Date.UTC(2026, 7, 10),
  })
  database.close()
  writeAlbumDraftData({
    ...firstTabDraft,
    coverImageUrl: 'https://example.com/edited-after-cover.webp',
  })

  await expect(readAlbumDraftCover(coverId)).resolves.not.toBeNull()
  expect(firstTabStorage.getItem('pomo:admin-music:album-draft:v1')).toContain(coverId)

  replaceSessionStorage(secondTabStorage)
  const {cleanup, result} = renderHook(() =>
    useAlbumDraft({refreshCatalog: async () => undefined, setMessage: vi.fn()}),
  )

  await waitFor(() => expect(result.isRestoringDraft()).toBe(false))
  replaceSessionStorage(firstTabStorage)

  try {
    expect(firstTabStorage.getItem('pomo:admin-music:album-draft:v1')).toContain(coverId)
    await expect(readAlbumDraftCover(coverId)).resolves.not.toBeNull()
  } finally {
    cleanup()
    database.close()
  }
})

it('should retain an expired cover while another tab hook is still mounted', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 8, 10))
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000003')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000004')
  const firstTabStorage = createSessionStorage()
  const secondTabStorage = createSessionStorage()
  const coverId = 'first-tab-active-cover'
  const firstTabDraft = {
    albumId: '00000000-0000-4000-8000-000000000002',
    coverDraftId: coverId,
    coverFallback: 'lp' as const,
    coverImageUrl: '',
    hasCoverFile: true,
    translations: createEmptyAlbumTranslations(),
  }
  replaceSessionStorage(firstTabStorage)
  writeAlbumDraftData(firstTabDraft)

  const database = new Dexie('pomo-admin-music-draft')
  database.version(3).stores({
    covers: 'id, updatedAt',
    draftReferences: 'id, coverDraftId, lastSeenAt',
  })
  const covers = database.table<{blob: Blob; id: string; updatedAt: number}>('covers')
  const draftReferences = database.table<{
    coverDraftId: string | null
    id: string
    lastSeenAt: number
  }>('draftReferences')
  await database.transaction('rw', covers, draftReferences, async () => {
    await covers.clear()
    await draftReferences.clear()
    await covers.put({
      blob: new File(['first-tab'], 'cover.webp', {type: 'image/webp'}),
      id: coverId,
      updatedAt: Date.UTC(2026, 7, 10),
    })
  })
  database.close()

  const firstTab = renderHook(() =>
    useAlbumDraft({refreshCatalog: async () => undefined, setMessage: vi.fn()}),
  )
  await waitFor(() => expect(firstTab.result.isRestoringDraft()).toBe(false))

  replaceSessionStorage(secondTabStorage)
  const secondTab = renderHook(() =>
    useAlbumDraft({refreshCatalog: async () => undefined, setMessage: vi.fn()}),
  )
  await waitFor(() => expect(secondTab.result.isRestoringDraft()).toBe(false))

  try {
    await expect(readAlbumDraftCover(coverId)).resolves.not.toBeNull()
  } finally {
    secondTab.cleanup()
    firstTab.cleanup()
  }
})
