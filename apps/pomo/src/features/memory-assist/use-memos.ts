import {subscribeWebStorageChange} from 'src/utils/subscribe-web-storage-change'
import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {isMemoryMemoDeletionPending} from './is-memory-memo-deletion-pending'
import {
  MEMORY_MEMOS_CHANGED_EVENT,
  MEMORY_MEMOS_STORAGE_KEY,
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
  let storageReadRevision = 0
  const deletionTombstones = new Map<string, Set<string>>()

  onMount(() => {
    const applyMemos = (nextMemos: ReadonlyArray<MemoryMemo>) => {
      for (const memo of nextMemos) {
        if (isMemoryMemoDeletionPending(memo)) {
          const createdAtValues = deletionTombstones.get(memo.id) ?? new Set<string>()
          createdAtValues.add(memo.createdAt)
          deletionTombstones.set(memo.id, createdAtValues)
        }
      }
      setMemos(nextMemos)
    }
    const handleChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const change = parseMemoryMemosChangedEvent(event.detail)

      if (change !== null && change.revision > storageRevision) {
        storageRevision = change.revision
        applyMemos(change.memos)
      }
    }
    const readStoredMemos = (apply: (storedMemos: ReadonlyArray<MemoryMemo>) => void) => {
      const currentStorageRevision = storageRevision
      storageReadRevision += 1
      const currentReadRevision = storageReadRevision

      readMemoryMemos()
        .then((storedMemos) => {
          if (
            !isDisposed &&
            storageRevision === currentStorageRevision &&
            storageReadRevision === currentReadRevision
          ) {
            apply(storedMemos)
          }
        })
        .catch((error: unknown) => {
          console.error('Failed to load memory memos.', error)
        })
    }
    useEvent(globalThis.window, MEMORY_MEMOS_CHANGED_EVENT, handleChange)
    onCleanup(
      subscribeWebStorageChange({
        includeUnknownArea: false,
        key: MEMORY_MEMOS_STORAGE_KEY,
        onChange: () => readStoredMemos(applyMemos),
      }),
    )
    readStoredMemos(setMemos)

    onCleanup(() => {
      isDisposed = true
    })
  })

  const isHiddenMemo = (memo: MemoryMemo) =>
    isMemoryMemoDeletionPending(memo) ||
    deletionTombstones.get(memo.id)?.has(memo.createdAt) === true

  return () => memos().filter((memo) => !isHiddenMemo(memo))
}
