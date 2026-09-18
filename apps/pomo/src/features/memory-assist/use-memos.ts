import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {isMemoryMemoDeletionPending} from './is-memory-memo-deletion-pending'
import {
  MEMORY_MEMOS_CHANGED_EVENT,
  type MemoryMemosChangedEventDetail,
  readMemoryMemos,
} from './repository'
import {type MemoryMemo, parseMemoryMemos} from './schema'

const parseMemoryMemosChangedEvent = (detail: unknown): MemoryMemosChangedEventDetail | null => {
  if (
    typeof detail !== 'object' ||
    detail === null ||
    !('memos' in detail) ||
    !('revision' in detail) ||
    typeof detail.revision !== 'number' ||
    !Number.isSafeInteger(detail.revision) ||
    detail.revision <= 0
  ) {
    return null
  }

  const memos = parseMemoryMemos(detail.memos)
  return memos === null ? null : {memos, revision: detail.revision}
}

export const useMemoryMemos = (): Accessor<ReadonlyArray<MemoryMemo>> => {
  const [memos, setMemos] = createSignal<ReadonlyArray<MemoryMemo>>([])
  let isDisposed = false
  let storageRevision = 0
  const deletionTombstones = new Map<string, Set<string>>()

  onMount(() => {
    const initialRevision = storageRevision
    const handleChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const change = parseMemoryMemosChangedEvent(event.detail)

      if (change !== null && change.revision > storageRevision) {
        for (const memo of change.memos) {
          if (isMemoryMemoDeletionPending(memo)) {
            const createdAtValues = deletionTombstones.get(memo.id) ?? new Set<string>()
            createdAtValues.add(memo.createdAt)
            deletionTombstones.set(memo.id, createdAtValues)
          }
        }
        storageRevision = change.revision
        setMemos(change.memos)
      }
    }

    useEvent(globalThis.window, MEMORY_MEMOS_CHANGED_EVENT, handleChange)
    readMemoryMemos()
      .then((storedMemos) => {
        if (!isDisposed && storageRevision === initialRevision) {
          setMemos(storedMemos)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load memory memos.', error)
      })

    onCleanup(() => {
      isDisposed = true
    })
  })

  const isHiddenMemo = (memo: MemoryMemo) =>
    isMemoryMemoDeletionPending(memo) ||
    deletionTombstones.get(memo.id)?.has(memo.createdAt) === true

  return () => memos().filter((memo) => !isHiddenMemo(memo))
}
