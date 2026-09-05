import {deleteDialogueAudio} from '../focus-room-dialogue'
import {getMemoryMemoDialogueId} from './dialogue-id'
import {readMemoryMemos, updateMemoryMemos} from './repository'

export interface DeleteMemoryMemoOptions {
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly memoId: string
}

export type MemoryMemoDeletionResult = 'deleted' | 'cleanupPending'

const pendingDeletions = new Map<string, Promise<MemoryMemoDeletionResult>>()

const persistDeletion = async (
  options: DeleteMemoryMemoOptions,
): Promise<MemoryMemoDeletionResult> => {
  const snapshot = await updateMemoryMemos((memos) =>
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
      await deleteDialogueAudio(memo.dialogueId, {failureMode: 'throw'})
    }

    await updateMemoryMemos((memos) =>
      memos.filter((current) => current.id !== memo.id || current.deletionPending !== true),
    )
    return 'deleted'
  } catch (error: unknown) {
    console.error('Memory memo deletion is committed; resource cleanup will retry.', error)
    return 'cleanupPending'
  }
}

/** Commits logical deletion before releasing memo-owned resources; rejects only before that commit. */
export const deleteMemoryMemo = (
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
export const retryMemoryMemoDeletions = async (
  deleteDialogue: DeleteMemoryMemoOptions['deleteDialogue'],
): Promise<void> => {
  const memos = await readMemoryMemos()

  const results = await Promise.allSettled(
    memos
      .filter((memo) => memo.deletionPending === true)
      .map((memo) => deleteMemoryMemo({deleteDialogue, memoId: memo.id})),
  )
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to retry memory memo deletions.')
  }
}
