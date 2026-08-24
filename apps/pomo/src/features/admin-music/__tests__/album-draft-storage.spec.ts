/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {type AlbumDraftData, createEmptyAlbumTranslations} from '../album-draft'
import {
  type AlbumDraftStorage,
  deleteAlbumDraft,
  deleteExpiredAlbumDraftCovers,
  readAlbumDraftCover,
  readAlbumDraftData,
  writeAlbumDraftCover,
  writeAlbumDraftData,
} from '../album-draft-storage'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const createStorage = () => {
  const covers = new Map<string, Blob>()
  const coverSavedAt = new Map<string, number>()
  let data: string | null = null
  const storage: AlbumDraftStorage = {
    deleteCover: vi.fn(async (id) => {
      covers.delete(id)
      coverSavedAt.delete(id)
    }),
    deleteData: vi.fn(() => {
      data = null
    }),
    deleteExpiredCovers: vi.fn(async ({expiresBefore, protectedId}) => {
      for (const [id, savedAt] of coverSavedAt) {
        if (savedAt < expiresBefore && id !== protectedId) {
          covers.delete(id)
          coverSavedAt.delete(id)
        }
      }
    }),
    readCover: vi.fn(async (id) => covers.get(id) ?? null),
    readData: vi.fn(() => data),
    writeCover: vi.fn(async (id, nextCover) => {
      covers.set(id, nextCover)
      coverSavedAt.set(id, Date.now())
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
  it('should delete covers older than 30 days while preserving the active draft', async () => {
    vi.useFakeTimers()
    const storage = createStorage()
    const now = new Date('2026-08-25T00:00:00.000Z')
    const oldCover = new File(['old'], 'cover.webp', {type: 'image/webp'})

    vi.setSystemTime(new Date('2026-07-25T23:59:59.999Z'))
    await writeAlbumDraftCover('expired', oldCover, storage)
    await writeAlbumDraftCover('active', oldCover, storage)
    vi.setSystemTime(new Date('2026-07-26T00:00:00.000Z'))
    await writeAlbumDraftCover('boundary', oldCover, storage)
    vi.setSystemTime(now)

    await deleteExpiredAlbumDraftCovers({
      activeCoverDraftId: 'active',
      now: () => now.getTime(),
      storage,
    })

    await expect(readAlbumDraftCover('expired', storage)).resolves.toBeNull()
    await expect(readAlbumDraftCover('active', storage)).resolves.not.toBeNull()
    await expect(readAlbumDraftCover('boundary', storage)).resolves.not.toBeNull()
  })

  it('should report an expired cover cleanup failure without throwing', async () => {
    const storage = createStorage()
    const error = new Error('indexed db unavailable')
    vi.mocked(storage.deleteExpiredCovers).mockRejectedValueOnce(error)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(
      deleteExpiredAlbumDraftCovers({activeCoverDraftId: null, storage}),
    ).resolves.toEqual({error, success: false})
    expect(warn).toHaveBeenCalledOnce()
  })

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
