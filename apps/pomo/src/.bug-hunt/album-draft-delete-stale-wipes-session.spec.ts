/** @vitest-environment node */

import {expect, it, vi} from 'vitest'

import {type AlbumDraftData, createEmptyAlbumTranslations} from '../features/admin-music/album-draft'
import {
  type AlbumDraftStorage,
  deleteAlbumDraft,
  readAlbumDraftDataOrNull,
  writeAlbumDraftCover,
  writeAlbumDraftData,
} from '../features/admin-music/album-draft-storage'

const createStorage = () => {
  const covers = new Map<string, Blob>()
  let data: string | null = null
  const storage: AlbumDraftStorage = {
    deleteCover: vi.fn(async ({id}) => {
      covers.delete(id)
    }),
    deleteData: vi.fn(() => {
      data = null
    }),
    deleteDraftReference: vi.fn(async () => undefined),
    deleteExpiredCovers: vi.fn(async () => undefined),
    readCover: vi.fn(async (id) => covers.get(id) ?? null),
    readData: vi.fn(() => data),
    writeCover: vi.fn(async (id, blob) => {
      covers.set(id, blob)
    }),
    writeData: vi.fn((nextData) => {
      data = nextData
    }),
    writeDraftReference: vi.fn(async () => undefined),
  }

  return storage
}

const draftWithoutCover: AlbumDraftData = {
  albumId: '00000000-0000-4000-8000-000000000001',
  coverDraftId: null,
  coverFallback: 'cd',
  coverImageUrl: 'https://storage.pomofi.io/cover.webp',
  hasCoverFile: false,
  translations: {
    ...createEmptyAlbumTranslations(),
    ko: {description: '설명', title: '제목'},
  },
}

it('should keep the session draft when deleting an unrelated stale cover id', async () => {
  const storage = createStorage()
  const cover = new File(['cover'], 'cover.webp', {type: 'image/webp'})
  await writeAlbumDraftCover('stale-cover', cover, storage)
  writeAlbumDraftData(draftWithoutCover, storage)

  await expect(deleteAlbumDraft('stale-cover', {storage})).resolves.toEqual({success: true})

  expect(readAlbumDraftDataOrNull(storage)).toEqual(draftWithoutCover)
})
