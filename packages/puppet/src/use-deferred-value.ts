import {createSignal, onCleanup, untrack} from 'solid-js'

interface DeferredValueOptions<T> {
  /** Initially displayed and committed value. */
  readonly initialValue: T
  /** Applies the latest request after the immediate UI has had a frame to paint; omitted for state only. */
  readonly onCommit?: (value: T) => void
}

/** Publishes selection feedback immediately, then commits only the latest request after a paint opportunity. */
export const useDeferredValue = <T>(options: DeferredValueOptions<T>) => {
  const initial = untrack(() => options.initialValue)
  let current = {committed: initial, pending: false, value: initial}
  const [published, publish] = createSignal(current)
  const read = () => {
    published()
    return current
  }
  const update = (changes: Partial<typeof current>) => {
    current = {...current, ...changes}
    publish(current)
  }
  let revision = 0
  let frame: number | undefined
  const cancel = () => {
    revision += 1
    if (frame !== undefined) {
      globalThis.cancelAnimationFrame(frame)
      frame = undefined
    }
  }
  const reset = (next: T) => {
    cancel()
    update({committed: next, pending: false, value: next})
  }
  const select = (next: T) => {
    if (
      Object.is(next, current.committed) ||
      typeof globalThis.requestAnimationFrame !== 'function'
    ) {
      reset(next)
      untrack(() => options.onCommit?.(next))
      return
    }
    cancel()
    const requestedRevision = revision
    update({pending: true, value: next})
    const commit = () => {
      if (requestedRevision !== revision) {
        return
      }
      frame = undefined
      untrack(() => options.onCommit?.(next))
      update({committed: next, pending: false})
    }
    frame = globalThis.requestAnimationFrame(() => {
      if (requestedRevision === revision) {
        frame = globalThis.requestAnimationFrame(commit)
      }
    })
  }
  onCleanup(cancel)
  return {
    committed: () => read().committed,
    pending: () => read().pending,
    reset,
    select,
    value: () => read().value,
  }
}
