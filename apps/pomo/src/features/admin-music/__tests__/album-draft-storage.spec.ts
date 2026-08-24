/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {type AlbumDraftData, createEmptyAlbumTranslations} from '../album-draft'
import {
  type AlbumDraftStorage,
  deleteAlbumDraft,
  readAlbumDraftCover,
  readAlbumDraftData,
  writeAlbumDraftCover,
  writeAlbumDraftData,
} from '../album-draft-storage'

afterEach(() => {
  vi.restoreAllMocks()
})

const createStorage = () => {
  const covers = new Map<string, Blob>()
  let data: string | null = null
  const storage: AlbumDraftStorage = {
    deleteCover: vi.fn(async (id) => {
      covers.delete(id)
    }),
    deleteData: vi.fn(() => {
      data = null
    }),
    readCover: vi.fn(async (id) => covers.get(id) ?? null),
    readData: vi.fn(() => data),
    writeCover: vi.fn(async (id, nextCover) => {
      covers.set(id, nextCover)
    }),
    writeData: vi.fn((nextData) => {
      data = nextData
    }),
  }

  return storage
}

const createDraft = (): AlbumDraftData => ({
  coverDraftId: 'draft-cover-id',
  coverFallback: 'cd',
  coverImageUrl: 'https://storage.pomofi.io/cover.webp',
  hasCoverFile: true,
  translations: {
    ...createEmptyAlbumTranslations(),
    ko: {description: '앨범 설명', title: '앨범 제목'},
  },
})

describe('album draft data storage', () => {
  it('should restore album metadata saved in the current session', () => {
    const storage = createStorage()
    const draft = createDraft()

    writeAlbumDraftData(draft, storage)

    expect(readAlbumDraftData(storage)).toEqual(draft)
  })

  it('should ignore malformed stored metadata', () => {
    const storage = createStorage()
    storage.writeData('{invalid')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(readAlbumDraftData(storage)).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('album draft cover storage', () => {
  it('should restore the prepared WebP file and delete the full draft after creation', async () => {
    const storage = createStorage()
    const draft = createDraft()
    const cover = new File(['webp'], 'cover.webp', {type: 'image/webp'})
    writeAlbumDraftData(draft, storage)
    await writeAlbumDraftCover(draft.coverDraftId!, cover, storage)

    const restoredCover = await readAlbumDraftCover(draft.coverDraftId!, storage)

    expect(restoredCover?.name).toBe('cover.webp')
    expect(restoredCover?.type).toBe('image/webp')

    await deleteAlbumDraft(draft.coverDraftId, storage)

    expect(readAlbumDraftData(storage)).toBeNull()
    await expect(readAlbumDraftCover(draft.coverDraftId!, storage)).resolves.toBeNull()
  })

  it('should isolate cover files belonging to separate browser tabs', async () => {
    const storage = createStorage()
    const firstCover = new File(['first'], 'cover.webp', {type: 'image/webp'})
    const secondCover = new File(['second'], 'cover.webp', {type: 'image/webp'})

    await writeAlbumDraftCover('first-tab', firstCover, storage)
    await writeAlbumDraftCover('second-tab', secondCover, storage)
    await deleteAlbumDraft('second-tab', storage)

    await expect(readAlbumDraftCover('first-tab', storage)).resolves.not.toBeNull()
    await expect(readAlbumDraftCover('second-tab', storage)).resolves.toBeNull()
  })

  it('should report a cover persistence failure to the caller', async () => {
    const storage = createStorage()
    const error = new Error('quota exceeded')
    vi.mocked(storage.writeCover).mockRejectedValueOnce(error)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const result = await writeAlbumDraftCover(
      'cover-id',
      new File(['cover'], 'cover.webp', {type: 'image/webp'}),
      storage,
    )

    expect(result).toEqual({error, success: false})
    expect(warn).toHaveBeenCalledOnce()
  })
})
