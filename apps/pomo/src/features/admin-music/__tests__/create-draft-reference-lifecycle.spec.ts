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

  it('should release before initialization without loading storage', async () => {
    const loadStorage = vi.fn(async () => createStorage())
    const reference = createDraftReferenceLifecycle({loadStorage})

    await reference.release()

    expect(loadStorage).not.toHaveBeenCalled()
  })
})
