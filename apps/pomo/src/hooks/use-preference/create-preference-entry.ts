import {isPromise} from '@winter-love/utils'
import {batch, createSignal} from 'solid-js'
import type {PreferenceStorage} from 'src/utils/preference-storage'
import type {PreferenceEntry, PreferenceSnapshot} from './context'

interface PreferenceReadFailure {
  readonly error: unknown
}
type PreferenceReadResult = PreferenceSnapshot | PreferenceReadFailure

export interface StoredPreference extends PreferenceEntry {
  readonly restore: () => void
}
export interface PreferenceEntryOptions {
  readonly key: string
  readonly storage: PreferenceStorage
  readonly isActive: () => boolean
  readonly onError: (error: unknown) => void
}

/** Shares a preference; initial edits replace restoration and persist after it settles. */
export const createPreferenceEntry = (options: PreferenceEntryOptions): StoredPreference => {
  const [snapshot, setSnapshot] = createSignal<PreferenceSnapshot | null>(null)
  const saves = new Set<() => void>()
  const listeners = new Set<(error: unknown) => void>()
  let revision = 0
  let initialized = false
  let restoring = false
  let edited = false
  let pending: Promise<void> | null = null
  const reportError = (error: unknown) => {
    if (listeners.size === 0) {
      options.onError(error)
    } else {
      listeners.forEach((listener) => listener(error))
    }
  }
  const reportWrite = (error: unknown) => {
    if (error !== null && error !== undefined) {
      reportError(error)
    } else {
      saves.forEach((listener) => listener())
    }
  }
  const persist = (value: unknown): Promise<void> | null => {
    try {
      const result = options.storage.write(options.key, value)
      if (isPromise(result)) {
        return result.then(reportWrite, reportError)
      }
      reportWrite(result)
    } catch (error: unknown) {
      reportError(error)
    }
    return null
  }
  const enqueue = (value: unknown) => {
    const previous = pending
    const completion =
      previous === null ? persist(value) : previous.then(() => persist(value)).then(() => undefined)
    // A synchronous save callback may already have queued another asynchronous edit.
    if (pending === previous) {
      pending = completion
    }
  }
  const finishInitial = () => {
    initialized = true
    restoring = false
    const current = snapshot()
    if (edited && current !== null) {
      enqueue(current.value)
    }
  }
  const read = (version: number, initial: boolean) => {
    if (!options.isActive() || (!initial && version !== revision)) {
      return
    }
    const complete = (result: PreferenceReadResult) =>
      batch(() => {
        if (!options.isActive()) {
          if (initial && edited) {
            finishInitial()
          }
          return
        }
        if (initial && !edited && version !== revision) {
          read(revision, true)
          return
        }
        if (!initial && version !== revision) {
          return
        }
        if ('error' in result) {
          if (snapshot() === null) {
            setSnapshot({value: null})
          }
        } else if (!initial || !edited) {
          setSnapshot(result)
        }
        if (initial) {
          finishInitial()
        }
        if ('error' in result) {
          reportError(result.error)
        }
      })
    const accept = (value: unknown) => complete({value})
    const reject = (error: unknown) => complete({error})
    try {
      const value = options.storage.read(options.key)
      if (isPromise(value)) {
        const finishRead = (handle: (value: unknown) => void) => (value: unknown) => {
          if (pending === completion) {
            pending = null
          }
          handle(value)
        }
        const completion = value.then(finishRead(accept), finishRead(reject))
        pending = completion
      } else {
        accept(value)
      }
    } catch (error: unknown) {
      reject(error)
    }
  }
  return {
    restore() {
      revision += 1
      if (!initialized && restoring) {
        return
      }
      const version = revision
      const initial = !initialized
      if (initial) {
        restoring = true
      }
      if (pending === null) {
        read(version, initial)
      } else {
        pending.then(() => read(version, initial))
      }
    },
    setValue(value) {
      if (!options.isActive()) {
        return
      }
      revision += 1
      edited = true
      batch(() => {
        setSnapshot({value})
        if (initialized) {
          enqueue(value)
        }
      })
    },
    snapshot,
    subscribeErrors(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    subscribeSaves(listener) {
      saves.add(listener)
      return () => {
        saves.delete(listener)
      }
    },
  }
}
