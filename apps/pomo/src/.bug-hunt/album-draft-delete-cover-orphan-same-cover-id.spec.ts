/** Repro: concurrent session update keeps same coverDraftId → cover blob deleted, metadata still references it. */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  type AlbumDraftData,
  createEmptyAlbumTranslations,
} from '../features/admin-music/album-draft'
import {
  type AlbumDraftStorage,
  deleteAlbumDraft,
  readAlbumDraftCoverOrNull,
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
    deleteDraftReference: vi.fn(async () => {}),
    deleteExpiredCovers: vi.fn(async () => {}),
    readCover: vi.fn(async (id) => covers.get(id) ?? null),
    readData: vi.fn(() => data),
    writeCover: vi.fn(async (id, nextCover) => {
      covers.set(id, nextCover)
    }),
    writeData: vi.fn((nextData) => {
      data = nextData
    }),
    writeDraftReference: vi.fn(async () => {}),
  }

  return {covers, storage}
}

const createDraft = (): AlbumDraftData => ({
  albumId: '00000000-0000-4000-8000-000000000002',
  coverDraftId: 'draft-cover-id',
  coverFallback: 'cd',
  coverImageUrl: 'https://storage.pomofi.io/cover.webp',
  hasCoverFile: true,
  translations: {
    ...createEmptyAlbumTranslations(),
    ko: {description: '앨범 설명', title: '앨범 제목'},
  },
})

describe('deleteAlbumDraft concurrent session update (bug hunt)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should not orphan cover blob when session updates but keeps the same coverDraftId', async () => {
    const {covers, storage} = createStorage()
    const draft = createDraft()
    const coverBytes = new Uint8Array([1, 2, 3])
    writeAlbumDraftData(draft, storage)
    await writeAlbumDraftCover(draft.coverDraftId!, coverBytes, storage)

    const updatedDraft: AlbumDraftData = {
      ...draft,
      translations: {
        ...draft.translations,
        ko: {...draft.translations.ko, title: '제목만 변경'},
      },
    }

    vi.mocked(storage.deleteCover).mockImplementationOnce(async ({id}) => {
      writeAlbumDraftData(updatedDraft, storage)
      covers.delete(id)
    })

    await expect(deleteAlbumDraft(draft.coverDraftId, {storage})).resolves.toEqual({success: true})
    expect(readAlbumDraftDataOrNull(storage)).toEqual(updatedDraft)
    await expect(readAlbumDraftCoverOrNull(draft.coverDraftId!, storage)).resolves.not.toBeNull()
  })
})
