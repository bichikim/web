import type {AlbumDraftStorageResult} from './album-draft-storage'

export type DraftReferenceUpdater = (
  coverDraftId: string | null,
) => Promise<AlbumDraftStorageResult>

export interface DraftReferenceStorage {
  readonly deleteAlbumDraftReference: (id: string) => Promise<AlbumDraftStorageResult>
  readonly writeAlbumDraftReference: (options: {
    readonly coverDraftId: string | null
    readonly referenceId: string
  }) => Promise<AlbumDraftStorageResult>
}

export interface DraftReferenceOptions {
  readonly loadStorage: () => Promise<DraftReferenceStorage>
}

export interface DraftReferenceLifecycle {
  readonly getCoverDraftId: () => string | null
  readonly release: () => Promise<void>
  readonly setId: (id: string) => void
  readonly update: DraftReferenceUpdater
}

export const createDraftReferenceLifecycle = (
  options: DraftReferenceOptions,
): DraftReferenceLifecycle => {
  let coverDraftId: string | null = null
  let isReleased = false
  let referenceId: string | null = null
  let releasePromise: Promise<void> | null = null
  let referenceOperation: Promise<void> = Promise.resolve()

  const enqueueReferenceOperation = <T>(operation: () => Promise<T>): Promise<T> => {
    const queuedOperation = referenceOperation.then(operation)
    referenceOperation = queuedOperation.then(
      () => undefined,
      () => undefined,
    )
    return queuedOperation
  }

  const setId = (id: string): void => {
    referenceId = id
  }
  const update: DraftReferenceUpdater = (nextCoverDraftId) => {
    if (isReleased) {
      return Promise.resolve({
        error: new Error('The admin album draft reference has been released.'),
        success: false,
      })
    }

    coverDraftId = nextCoverDraftId
    const currentReferenceId = referenceId

    if (currentReferenceId === null) {
      return Promise.resolve({
        error: new Error('The admin album draft reference has not been initialized.'),
        success: false,
      })
    }

    return enqueueReferenceOperation(async () => {
      try {
        const {writeAlbumDraftReference} = await options.loadStorage()

        if (isReleased) {
          return {
            error: new Error('The admin album draft reference has been released.'),
            success: false,
          }
        }

        return await writeAlbumDraftReference({
          coverDraftId: nextCoverDraftId,
          referenceId: currentReferenceId,
        })
      } catch (error: unknown) {
        console.warn('Failed to update the admin album draft reference.', error)
        return {error, success: false}
      }
    })
  }
  const release = (): Promise<void> => {
    if (releasePromise !== null) {
      return releasePromise
    }

    isReleased = true
    const currentReferenceId = referenceId
    releasePromise = enqueueReferenceOperation(async () => {
      if (currentReferenceId === null) {
        return
      }

      try {
        const {deleteAlbumDraftReference} = await options.loadStorage()
        const result = await deleteAlbumDraftReference(currentReferenceId)
        if (!result.success) {
          console.warn(
            'Failed to delete the admin album draft reference during release.',
            result.error,
          )
        }
      } catch (error: unknown) {
        console.warn('Failed to delete the admin album draft reference.', error)
      }
    })
    return releasePromise
  }

  return {getCoverDraftId: () => coverDraftId, release, setId, update}
}
