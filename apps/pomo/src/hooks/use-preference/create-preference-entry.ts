import {isPromise} from '@winter-love/utils'
import {batch, createSignal} from 'solid-js'
import type {PreferenceStorage} from './types'
import type {
  PreferenceEntry,
  PreferenceErrorListener,
  PreferenceSetValueOptions,
  PreferenceSnapshot,
} from './context'

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

interface PreferenceWrite {
  readonly value: unknown
  readonly editRevision: number
  readonly rollbackOnError: boolean
}

interface PreferenceWriterOptions {
  readonly isCurrent: (editRevision: number) => boolean
  readonly onError: PreferenceErrorListener
  readonly onRollback: (snapshot: PreferenceSnapshot) => void
  readonly onSaved: () => void
  readonly write: (value: unknown) => ReturnType<PreferenceStorage['write']>
}

const createPreferenceWriter = (options: PreferenceWriterOptions) => {
  let committed: PreferenceSnapshot = {value: null}
  const reportFailure = (error: unknown, write: PreferenceWrite) => {
    const isCurrent = options.isCurrent(write.editRevision)
    if (write.rollbackOnError && isCurrent) {
      options.onRollback(committed)
    }
    options.onError(error, {isCurrent, operation: 'write'})
  }
  const reportWrite = (error: unknown, write: PreferenceWrite) => {
    if (error !== null && error !== undefined) {
      reportFailure(error, write)
    } else {
      committed = {value: write.value}
      options.onSaved()
    }
  }
  const persist = (write: PreferenceWrite): Promise<void> | null => {
    try {
      const result = options.write(write.value)
      if (isPromise(result)) {
        return result.then(
          (error) => reportWrite(error, write),
          (error: unknown) => reportFailure(error, write),
        )
      }
      reportWrite(result, write)
    } catch (error: unknown) {
      reportFailure(error, write)
    }
    return null
  }
  return {commit: (snapshot: PreferenceSnapshot) => (committed = snapshot), persist}
}

const subscribePreferenceListener = <Listener>(
  listeners: Set<Listener>,
  listener: Listener,
): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Shares a preference; initial edits replace restoration and persist after it settles. */
export const createPreferenceEntry = (options: PreferenceEntryOptions): StoredPreference => {
  const [snapshot, setSnapshot] = createSignal<PreferenceSnapshot | null>(null)
  const saves = new Set<() => void>()
  const listeners = new Set<PreferenceErrorListener>()
  let revision = 0
  // A storage refresh invalidates reads but does not supersede a local edit.
  let editRevision = 0
  let initialized = false
  let restoring = false
  let edited = false
  let shouldPersistInitialEdit = false
  let rollbackInitialEdit = false
  let pending: Promise<void> | null = null
  const reportError: PreferenceErrorListener = (error, context) => {
    if (listeners.size === 0) {
      options.onError(error)
    } else {
      listeners.forEach((listener) => listener(error, context))
    }
  }
  const writer = createPreferenceWriter({
    isCurrent: (version) => version === editRevision && options.isActive(),
    onError: reportError,
    onRollback: setSnapshot,
    onSaved: () => saves.forEach((listener) => listener()),
    write: (value) => options.storage.write(options.key, value),
  })
  const enqueue = (write: PreferenceWrite) => {
    const previous = pending
    const completion =
      previous === null
        ? writer.persist(write)
        : previous.then(() => writer.persist(write)).then(() => undefined)
    // A synchronous save callback may already have queued another asynchronous edit.
    if (pending === previous) {
      pending = completion
    }
  }
  const finishInitial = () => {
    initialized = true
    restoring = false
    const current = snapshot()
    if (edited && current !== null && shouldPersistInitialEdit) {
      enqueue({editRevision, rollbackOnError: rollbackInitialEdit, value: current.value})
    }
    shouldPersistInitialEdit = false
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
        } else {
          writer.commit(result)
          if (!initial || !edited) {
            setSnapshot(result)
          }
        }
        if (initial) {
          finishInitial()
        }
        if ('error' in result) {
          reportError(result.error, {isCurrent: true, operation: 'read'})
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
    setValue(value, valueOptions?: PreferenceSetValueOptions) {
      if (!options.isActive()) {
        return
      }
      revision += 1
      editRevision += 1
      const shouldPersist = valueOptions?.persist !== false
      edited = true
      if (shouldPersist) {
        shouldPersistInitialEdit = true
        rollbackInitialEdit = valueOptions?.rollbackOnError === true
      }
      batch(() => {
        setSnapshot({value})
        if (initialized && shouldPersist) {
          enqueue({editRevision, rollbackOnError: valueOptions?.rollbackOnError === true, value})
        }
      })
    },
    snapshot,
    subscribeErrors(listener) {
      return subscribePreferenceListener(listeners, listener)
    },
    subscribeSaves(listener) {
      return subscribePreferenceListener(saves, listener)
    },
  }
}
