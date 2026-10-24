import {describe, expect, it, vi} from 'vitest'

import {
  createDraftReferenceLifecycle,
  type DraftReferenceStorage,
} from '../create-draft-reference-lifecycle'

const createStorage = (): DraftReferenceStorage => ({
  deleteAlbumDraftReference: vi.fn(async () => ({success: true as const})),
  writeAlbumDraftReference: vi.fn(async () => ({success: true as const})),
})

describe('draft reference lifecycle', () => {
  it('should reject an update before initialization without loading storage', async () => {
    const loadStorage = vi.fn(async () => createStorage())
    const reference = createDraftReferenceLifecycle({loadStorage})

    await expect(reference.update('cover')).resolves.toMatchObject({success: false})
    expect(loadStorage).not.toHaveBeenCalled()
  })

  it('should retain the desired cover after a storage failure so it can be retried', async () => {
    const storage = createStorage()
    const reference = createDraftReferenceLifecycle({loadStorage: async () => storage})
    reference.setId('tab')
    const error = new Error('quota exceeded')
    vi.mocked(storage.writeAlbumDraftReference).mockResolvedValueOnce({error, success: false})

    await expect(reference.update('cover')).resolves.toEqual({error, success: false})
    expect(reference.getCoverDraftId()).toBe('cover')
    await expect(reference.update(reference.getCoverDraftId())).resolves.toEqual({success: true})
    expect(storage.writeAlbumDraftReference).toHaveBeenLastCalledWith({
      coverDraftId: 'cover',
      referenceId: 'tab',
    })
  })

  it('should prevent a delayed update from recreating a released reference', async () => {
    const storage = createStorage()
    let resolveStorage!: (storage: DraftReferenceStorage) => void
    const pendingStorage = new Promise<DraftReferenceStorage>((resolve) => {
      resolveStorage = resolve
    })
    const reference = createDraftReferenceLifecycle({loadStorage: () => pendingStorage})
    reference.setId('tab')
    const pendingUpdate = reference.update('cover')
    const release = reference.release()

    resolveStorage(storage)
    await release

    await expect(pendingUpdate).resolves.toMatchObject({success: false})
    expect(storage.writeAlbumDraftReference).not.toHaveBeenCalled()
    expect(storage.deleteAlbumDraftReference).toHaveBeenCalledExactlyOnceWith('tab')
    expect(reference.release()).toBe(release)
    await expect(reference.update('other-cover')).resolves.toMatchObject({success: false})
  })

  it('should wait for pending reference writes before releasing the reference', async () => {
    const storage = createStorage()
    let resolveWriteStarted!: () => void
    let resolveWrite!: () => void
    const writeStarted = new Promise<void>((resolve) => {
      resolveWriteStarted = resolve
    })
    const pendingWrite = new Promise<void>((resolve) => {
      resolveWrite = resolve
    })
    vi.mocked(storage.writeAlbumDraftReference).mockImplementationOnce(async () => {
      resolveWriteStarted()
      await pendingWrite
      return {success: true}
    })
    const reference = createDraftReferenceLifecycle({loadStorage: async () => storage})
    reference.setId('tab')

    const pendingUpdate = reference.update('cover')
    await writeStarted
    const release = reference.release()

    expect(storage.deleteAlbumDraftReference).not.toHaveBeenCalled()
    resolveWrite()

    await expect(pendingUpdate).resolves.toEqual({success: true})
    await release
    expect(storage.deleteAlbumDraftReference).toHaveBeenCalledExactlyOnceWith('tab')
  })

  it('should report a failed reference deletion during release', async () => {
    const storage = createStorage()
    const error = new Error('reference deletion failed')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(storage.deleteAlbumDraftReference).mockResolvedValueOnce({error, success: false})
    const reference = createDraftReferenceLifecycle({loadStorage: async () => storage})
    reference.setId('tab')

    await reference.release()

    expect(warning).toHaveBeenCalledWith(
      'Failed to delete the admin album draft reference during release.',
      error,
    )
  })

  it('should release before initialization without loading storage', async () => {
    const loadStorage = vi.fn(async () => createStorage())
    const reference = createDraftReferenceLifecycle({loadStorage})

    await reference.release()

    expect(loadStorage).not.toHaveBeenCalled()
  })
})
