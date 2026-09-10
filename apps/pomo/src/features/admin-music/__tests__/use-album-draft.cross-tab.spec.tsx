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

const cloneSessionStorage = (source: Storage): Storage => {
  const clone = createSessionStorage()

  for (let index = 0; index < source.length; index += 1) {
    const key = source.key(index)

    if (key !== null) {
      const value = source.getItem(key)

      if (value !== null) {
        clone.setItem(key, value)
      }
    }
  }

  return clone
}

const replaceSessionStorage = (storage: Storage): void => {
  Object.defineProperty(globalThis, 'sessionStorage', {configurable: true, value: storage})
}

const originalSessionStorage = globalThis.sessionStorage

afterEach(() => {
  replaceSessionStorage(originalSessionStorage)
  localStorage.clear()
  vi.restoreAllMocks()
})

it('should retain an expired cover referenced by another open tab session', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 8, 10))
  const firstTabStorage = createSessionStorage()
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
  expect(writeAlbumDraftData(firstTabDraft)).toEqual({success: true})
  await covers.put({
    blob: firstTabCover,
    id: coverId,
    updatedAt: Date.UTC(2026, 7, 10),
  })
  expect(
    writeAlbumDraftData({
      ...firstTabDraft,
      coverImageUrl: 'https://example.com/edited-after-cover.webp',
    }),
  ).toEqual({success: true})

  await expect(readAlbumDraftCover(coverId)).resolves.not.toBeNull()
  expect(firstTabStorage.getItem('pomo:admin-music:album-draft:v1')).toContain(coverId)

  const secondTabStorage = cloneSessionStorage(firstTabStorage)
  secondTabStorage.removeItem('pomo:admin-music:album-draft:v1')
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
