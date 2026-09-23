/** Repro: deleteAlbumDraft(staleCoverId) clears session while current coverDraftId blob remains. */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {createEmptyAlbumTranslations} from '../features/admin-music/album-draft'
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

describe('deleteAlbumDraft stale coverDraftId (bug hunt)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should not clear session metadata when the cover id argument does not match the stored draft', async () => {
    const {storage} = createStorage()
    const draft = {
      albumId: '00000000-0000-4000-8000-000000000002',
      coverDraftId: 'cover-b',
      coverFallback: 'cd' as const,
      coverImageUrl: 'https://storage.pomofi.io/cover.webp',
      hasCoverFile: true,
      translations: {
        ...createEmptyAlbumTranslations(),
        ko: {description: '앨범 설명', title: '앨범 제목'},
      },
    }
    writeAlbumDraftData(draft, storage)
    await writeAlbumDraftCover('cover-b', new Uint8Array([9]), storage)
    await writeAlbumDraftCover('cover-a', new Uint8Array([1]), storage)

    await expect(deleteAlbumDraft('cover-a', {storage})).resolves.toEqual({success: true})
    expect(readAlbumDraftDataOrNull(storage)).toEqual(draft)
    await expect(readAlbumDraftCoverOrNull('cover-b', storage)).resolves.not.toBeNull()
  })
})
