/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {type AlbumDraftData, createEmptyAlbumTranslations} from '../album-draft'
import {
  type AlbumDraftStorage,
  deleteAlbumDraft,
  deleteAlbumDraftCover,
  deleteExpiredAlbumDraftCovers,
  readAlbumDraftCover,
  readAlbumDraftCoverOrNull,
  readAlbumDraftData,
  readAlbumDraftDataOrNull,
  writeAlbumDraftCover,
  writeAlbumDraftData,
  writeAlbumDraftReference,
} from '../album-draft-storage'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const createStorage = () => {
  const covers = new Map<string, Blob>()
  const coverSavedAt = new Map<string, number>()
  const draftReferences = new Map<
    string,
    {readonly coverDraftId: string | null; readonly id: string; readonly lastSeenAt: number}
  >()
  let data: string | null = null
  const storage: AlbumDraftStorage = {
    deleteCover: vi.fn(async ({id}) => {
      covers.delete(id)
      coverSavedAt.delete(id)
    }),
    deleteData: vi.fn(() => {
      data = null
    }),
    deleteDraftReference: vi.fn(async (id) => {
      draftReferences.delete(id)
    }),
    deleteExpiredCovers: vi.fn(async ({expiresBefore, protectedId}) => {
      const referencedIds = new Set(
        [...draftReferences.values()]
          .filter((reference) => reference.lastSeenAt >= expiresBefore)
          .flatMap((reference) =>
            reference.coverDraftId === null ? [] : [reference.coverDraftId],
          ),
      )
      if (protectedId !== null) {
        referencedIds.add(protectedId)
      }

      for (const [id, savedAt] of coverSavedAt) {
        if (savedAt < expiresBefore && !referencedIds.has(id)) {
          covers.delete(id)
          coverSavedAt.delete(id)
        }
      }
      for (const [id, reference] of draftReferences) {
        if (reference.lastSeenAt < expiresBefore) {
          draftReferences.delete(id)
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
    writeDraftReference: vi.fn(async (reference) => {
      draftReferences.set(reference.id, reference)
    }),
  }

  return storage
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

const delayCoverDeletion = (storage: AlbumDraftStorage) => {
  const deletionGate = Promise.withResolvers<void>()
  const deleteCover = vi.mocked(storage.deleteCover).getMockImplementation()

  if (deleteCover === undefined) {
    throw new Error('The storage fixture must provide its default cover deletion.')
  }

  vi.mocked(storage.deleteCover).mockImplementationOnce(async (options) => {
    await deletionGate.promise
    await deleteCover(options)
  })

  return deletionGate
}

describe('album draft data storage', () => {
  it('should restore album metadata saved in the current session', () => {
    const storage = createStorage()
    const draft = createDraft()

    writeAlbumDraftData(draft, storage)

    expect(readAlbumDraftDataOrNull(storage)).toEqual(draft)
  })

  it('should ignore malformed stored metadata', () => {
    const storage = createStorage()
    storage.writeData('{invalid')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(readAlbumDraftData(storage)).toEqual({
      error: expect.any(Error),
      success: false,
    })
    warn.mockClear()
    expect(readAlbumDraftDataOrNull(storage)).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('should report metadata write failures', () => {
    const storage = createStorage()
    const error = new Error('session unavailable')
    vi.mocked(storage.writeData).mockImplementationOnce(() => {
      throw error
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(writeAlbumDraftData(createDraft(), storage)).toEqual({error, success: false})
  })
})

describe('album draft cover storage', () => {
  it('should report cover read failures without treating them as missing covers', async () => {
    const storage = createStorage()
    const error = new Error('indexed db unavailable')
    vi.mocked(storage.readCover).mockRejectedValueOnce(error)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(readAlbumDraftCover('broken', storage)).resolves.toEqual({
      error,
      success: false,
    })
    expect(warn).toHaveBeenCalledOnce()
  })

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

    await expect(readAlbumDraftCoverOrNull('expired', storage)).resolves.toBeNull()
    await expect(readAlbumDraftCoverOrNull('active', storage)).resolves.not.toBeNull()
    await expect(readAlbumDraftCoverOrNull('boundary', storage)).resolves.not.toBeNull()
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

  it('should retain an expired cover referenced by another active draft', async () => {
    vi.useFakeTimers()
    const storage = createStorage()
    const now = new Date('2026-08-25T00:00:00.000Z')
    const oldCover = new File(['old'], 'cover.webp', {type: 'image/webp'})

    vi.setSystemTime(new Date('2026-07-25T23:59:59.999Z'))
    await writeAlbumDraftCover('other-tab-cover', oldCover, storage)
    vi.setSystemTime(now)
    await writeAlbumDraftReference({
      coverDraftId: 'other-tab-cover',
      now: () => now.getTime(),
      referenceId: 'other-tab',
      storage,
    })

    await deleteExpiredAlbumDraftCovers({
      activeCoverDraftId: null,
      now: () => now.getTime(),
      storage,
    })

    await expect(readAlbumDraftCoverOrNull('other-tab-cover', storage)).resolves.not.toBeNull()
  })

  it('should restore the prepared WebP file and delete the full draft after creation', async () => {
    const storage = createStorage()
    const draft = createDraft()
    const cover = new File(['webp'], 'cover.webp', {type: 'image/webp'})
    writeAlbumDraftData(draft, storage)
    await writeAlbumDraftCover(draft.coverDraftId!, cover, storage)

    const restoredCover = await readAlbumDraftCoverOrNull(draft.coverDraftId!, storage)

    expect(restoredCover?.name).toBe('cover.webp')
    expect(restoredCover?.type).toBe('image/webp')

    await deleteAlbumDraft(draft.coverDraftId, {storage})

    expect(readAlbumDraftDataOrNull(storage)).toBeNull()
    await expect(readAlbumDraftCoverOrNull(draft.coverDraftId!, storage)).resolves.toBeNull()
  })

  it('should isolate cover files belonging to separate browser tabs', async () => {
    const storage = createStorage()
    const firstCover = new File(['first'], 'cover.webp', {type: 'image/webp'})
    const secondCover = new File(['second'], 'cover.webp', {type: 'image/webp'})

    await writeAlbumDraftCover('first-tab', firstCover, storage)
    await writeAlbumDraftCover('second-tab', secondCover, storage)
    await deleteAlbumDraft('second-tab', {storage})

    await expect(readAlbumDraftCoverOrNull('first-tab', storage)).resolves.not.toBeNull()
    await expect(readAlbumDraftCoverOrNull('second-tab', storage)).resolves.toBeNull()
  })

  it('should preserve a coverless session while deleting a stale cover blob', async () => {
    const storage = createStorage()
    const draft: AlbumDraftData = {
      ...createDraft(),
      coverDraftId: null,
      hasCoverFile: false,
    }
    const staleCover = new File(['stale'], 'cover.webp', {type: 'image/webp'})
    writeAlbumDraftData(draft, storage)
    await writeAlbumDraftCover('stale-cover', staleCover, storage)

    await expect(deleteAlbumDraft('stale-cover', {storage})).resolves.toEqual({success: true})

    expect(readAlbumDraftDataOrNull(storage)).toEqual(draft)
    await expect(readAlbumDraftCoverOrNull('stale-cover', storage)).resolves.toBeNull()
    expect(storage.deleteData).not.toHaveBeenCalled()
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

  it('should report cover read and deletion failures', async () => {
    const storage = createStorage()
    const readError = new Error('read failed')
    const deleteError = new Error('delete failed')
    vi.mocked(storage.readCover).mockRejectedValueOnce(readError)
    vi.mocked(storage.deleteCover).mockRejectedValueOnce(deleteError)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(readAlbumDraftCoverOrNull('cover', storage)).resolves.toBeNull()
    await expect(deleteAlbumDraftCover('cover', {storage})).resolves.toEqual({
      error: deleteError,
      success: false,
    })
  })

  it('should keep the draft when its cover cannot be read before deletion', async () => {
    const storage = createStorage()
    const draft = createDraft()
    const error = new Error('cover read failed')
    writeAlbumDraftData(draft, storage)
    vi.mocked(storage.readCover).mockRejectedValueOnce(error)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const result = await deleteAlbumDraft(draft.coverDraftId, {storage})

    expect(result).toEqual({error, success: false})
    expect(readAlbumDraftDataOrNull(storage)).toEqual(draft)
    expect(storage.deleteCover).not.toHaveBeenCalled()
    expect(storage.deleteData).not.toHaveBeenCalled()
  })

  it('should preserve the most relevant failure while deleting a draft', async () => {
    const storage = createStorage()
    const dataError = new Error('data delete failed')
    vi.mocked(storage.deleteData).mockImplementationOnce(() => {
      throw dataError
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(deleteAlbumDraft(null, {storage})).resolves.toEqual({
      error: dataError,
      success: false,
    })

    const coverError = new Error('cover delete failed')
    vi.mocked(storage.deleteCover).mockRejectedValueOnce(coverError)
    await expect(deleteAlbumDraft('cover', {storage})).resolves.toEqual({
      error: coverError,
      success: false,
    })
  })

  it('should preserve the album metadata when cover deletion fails', async () => {
    const storage = createStorage()
    const draft = createDraft()
    const error = new Error('cover delete failed')
    writeAlbumDraftData(draft, storage)
    vi.mocked(storage.deleteCover).mockRejectedValueOnce(error)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(deleteAlbumDraft(draft.coverDraftId, {storage})).resolves.toEqual({
      error,
      success: false,
    })
    expect(readAlbumDraftDataOrNull(storage)).toEqual(draft)
    expect(storage.deleteData).not.toHaveBeenCalled()
  })

  it('should preserve a newer album draft written while cover deletion is pending', async () => {
    const storage = createStorage()
    const draft = createDraft()
    const newerDraft: AlbumDraftData = {
      ...draft,
      albumId: '00000000-0000-4000-8000-000000000003',
      coverDraftId: null,
      hasCoverFile: false,
      translations: {
        ...draft.translations,
        ko: {...draft.translations.ko, title: '새 앨범'},
      },
    }
    writeAlbumDraftData(draft, storage)
    vi.mocked(storage.deleteCover).mockImplementationOnce(async () => {
      writeAlbumDraftData(newerDraft, storage)
    })

    await expect(deleteAlbumDraft(draft.coverDraftId, {storage})).resolves.toEqual({success: true})
    expect(readAlbumDraftDataOrNull(storage)).toEqual(newerDraft)
    expect(storage.deleteData).not.toHaveBeenCalled()
  })

  it('should restore the cover when newer album metadata retains its ID during deletion', async () => {
    const storage = createStorage()
    const draft = createDraft()
    const coverDraftId = draft.coverDraftId!
    const newerDraft: AlbumDraftData = {
      ...draft,
      translations: {
        ...draft.translations,
        ko: {...draft.translations.ko, title: '수정된 앨범 제목'},
      },
    }
    const cover = new File(['webp'], 'cover.webp', {type: 'image/webp'})
    writeAlbumDraftData(draft, storage)
    await writeAlbumDraftCover(coverDraftId, cover, storage)
    vi.mocked(storage.writeCover).mockClear()
    const deletionGate = delayCoverDeletion(storage)

    const pendingDeletion = deleteAlbumDraft(coverDraftId, {storage})
    writeAlbumDraftData(newerDraft, storage)
    deletionGate.resolve()

    const result = await pendingDeletion
    const restoredCover = await readAlbumDraftCoverOrNull(coverDraftId, storage)

    expect(result).toEqual({success: true})
    expect(readAlbumDraftDataOrNull(storage)).toEqual(newerDraft)
    expect(restoredCover).not.toBeNull()
    expect(restoredCover).toMatchObject({name: 'cover.webp', size: 4, type: 'image/webp'})
    expect(storage.writeCover).toHaveBeenCalledExactlyOnceWith(coverDraftId, cover)
    expect(storage.deleteData).not.toHaveBeenCalled()
  })

  it('should clear a missing cover reference when restoration fails', async () => {
    const storage = createStorage()
    const draft = createDraft()
    const coverDraftId = draft.coverDraftId!
    const newerDraft: AlbumDraftData = {
      ...draft,
      translations: {
        ...draft.translations,
        ko: {...draft.translations.ko, title: '수정된 앨범 제목'},
      },
    }
    const normalizedDraft: AlbumDraftData = {
      ...newerDraft,
      coverDraftId: null,
      hasCoverFile: false,
    }
    const error = new Error('cover restore failed')
    writeAlbumDraftData(draft, storage)
    await writeAlbumDraftCover(
      coverDraftId,
      new File(['webp'], 'cover.webp', {type: 'image/webp'}),
      storage,
    )
    const deletionGate = delayCoverDeletion(storage)
    vi.mocked(storage.writeCover).mockRejectedValueOnce(error)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const pendingDeletion = deleteAlbumDraft(coverDraftId, {storage})
    writeAlbumDraftData(newerDraft, storage)
    deletionGate.resolve()

    const result = await pendingDeletion

    expect(result).toEqual({error, success: false})
    expect(readAlbumDraftDataOrNull(storage)).toEqual(normalizedDraft)
    expect(await readAlbumDraftCoverOrNull(coverDraftId, storage)).toBeNull()
    expect(storage.deleteData).not.toHaveBeenCalled()
  })
})
