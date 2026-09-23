/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

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

  return {covers, storage}
}

it('should keep session draft metadata when cover deletion fails', async () => {
  const {covers, storage} = createStorage()
  const draft = createDraft()
  const cover = new File(['webp'], 'cover.webp', {type: 'image/webp'})

  writeAlbumDraftData(draft, storage)
  await writeAlbumDraftCover(draft.coverDraftId!, cover, storage)
  vi.mocked(storage.deleteCover).mockRejectedValueOnce(new Error('cover delete failed'))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)

  await expect(deleteAlbumDraft(draft.coverDraftId!, {storage})).resolves.toEqual({
    error: expect.any(Error),
    success: false,
  })

  expect(readAlbumDraftDataOrNull(storage)).toEqual(draft)
  expect(covers.has(draft.coverDraftId!)).toBe(true)
  await expect(readAlbumDraftCoverOrNull(draft.coverDraftId!, storage)).resolves.not.toBeNull()
})
