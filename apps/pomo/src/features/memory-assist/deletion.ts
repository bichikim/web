import {getMemoryMemoDialogueId} from './dialogue-id'
import type {MemoryMemo} from './schema'

export interface DeleteMemoryMemoOptions {
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly memoId: string
}

export type MemoryMemoDeletionResult = 'deleted' | 'cleanupPending'

export interface MemoryMemoDeletionOptions {
  readonly deleteAudio: (audioKey: string) => Promise<void>
  readonly read: () => Promise<ReadonlyArray<MemoryMemo>>
  readonly reportError: (error: unknown) => void
  readonly update: (
    update: (memos: ReadonlyArray<MemoryMemo>) => ReadonlyArray<MemoryMemo>,
  ) => Promise<ReadonlyArray<MemoryMemo>>
}

export interface MemoryMemoDeletion {
  readonly delete: (options: DeleteMemoryMemoOptions) => Promise<MemoryMemoDeletionResult>
  readonly retry: (deleteDialogue: DeleteMemoryMemoOptions['deleteDialogue']) => Promise<void>
}

/** Owns deletion deduplication for one set of memo storage and audio capabilities. */
export const createMemoryMemoDeletion = (
  dependencies: MemoryMemoDeletionOptions,
): MemoryMemoDeletion => {
  const pendingDeletions = new Map<string, Promise<MemoryMemoDeletionResult>>()

  const persistDeletion = async (
    options: DeleteMemoryMemoOptions,
  ): Promise<MemoryMemoDeletionResult> => {
    const snapshot = await dependencies.update((memos) =>
      memos.map((memo) => (memo.id === options.memoId ? {...memo, deletionPending: true} : memo)),
    )
    const memo = snapshot.find((current) => current.id === options.memoId)

    if (memo === undefined) {
      return 'deleted'
    }

    try {
      if (memo.dialogueId === getMemoryMemoDialogueId(memo.id)) {
        await options.deleteDialogue(memo.dialogueId)
        // Metadata may already be gone after an earlier attempt; retain the owned audio key until both formats are removed.
        await dependencies.deleteAudio(memo.dialogueId)
      }

      await dependencies.update((memos) =>
        memos.filter((current) => current.id !== memo.id || current.deletionPending !== true),
      )
      return 'deleted'
    } catch (error: unknown) {
      dependencies.reportError(error)
      return 'cleanupPending'
    }
  }

  /** Commits logical deletion before releasing memo-owned resources; rejects only before that commit. */
  const deleteMemoryMemo = (
    options: DeleteMemoryMemoOptions,
  ): Promise<MemoryMemoDeletionResult> => {
    const existing = pendingDeletions.get(options.memoId)

    if (existing !== undefined) {
      return existing
    }

    const pending = persistDeletion(options).finally(() => pendingDeletions.delete(options.memoId))
    pendingDeletions.set(options.memoId, pending)
    return pending
  }

  /** Retries persisted deletions without deleting resources belonging to active memos. */
  const retryMemoryMemoDeletions = async (
    deleteDialogue: DeleteMemoryMemoOptions['deleteDialogue'],
  ): Promise<void> => {
    const memos = await dependencies.read()

    const results = await Promise.allSettled(
      memos
        .filter((memo) => memo.deletionPending === true)
        .map((memo) => deleteMemoryMemo({deleteDialogue, memoId: memo.id})),
    )
    const errors = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    )

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Failed to retry memory memo deletions.')
    }
  }

  return {delete: deleteMemoryMemo, retry: retryMemoryMemoDeletions}
}
