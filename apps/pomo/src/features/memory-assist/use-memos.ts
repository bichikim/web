import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {MEMORY_MEMOS_CHANGED_EVENT, readMemoryMemos} from './repository'
import {type MemoryMemo, parseMemoryMemos} from './schema'

export const useMemoryMemos = (): Accessor<ReadonlyArray<MemoryMemo>> => {
  const [memos, setMemos] = createSignal<ReadonlyArray<MemoryMemo>>([])
  let isDisposed = false
  let storageRevision = 0

  onMount(() => {
    const initialRevision = storageRevision
    const handleChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const nextMemos = parseMemoryMemos(event.detail)

      if (nextMemos !== null) {
        storageRevision += 1
        setMemos(nextMemos)
      }
    }

    useEvent(window, MEMORY_MEMOS_CHANGED_EVENT, handleChange)
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

  return memos
}
