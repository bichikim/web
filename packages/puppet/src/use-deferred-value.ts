import {batch, createSignal, onCleanup, untrack} from 'solid-js'

interface DeferredValueOptions<T> {
  /** Initially displayed and committed value. */
  readonly initialValue: T
  /** Applies the latest request after the immediate UI has had a frame to paint; omitted for state only. */
  readonly onCommit?: (value: T) => void
}

/** Publishes selection feedback immediately, then commits only the latest request after a paint opportunity. */
export const useDeferredValue = <T>(options: DeferredValueOptions<T>) => {
  const [value, setValue] = createSignal(options.initialValue)
  const [committed, setCommitted] = createSignal(options.initialValue)
  const [pending, setPending] = createSignal(false)
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
    batch(() => {
      setValue(() => next)
      setCommitted(() => next)
      setPending(false)
    })
  }
  const select = (next: T) => {
    if (Object.is(next, committed()) || typeof globalThis.requestAnimationFrame !== 'function') {
      reset(next)
      untrack(() => options.onCommit?.(next))
      return
    }
    cancel()
    const requestedRevision = revision
    batch(() => {
      setValue(() => next)
      setPending(true)
    })
    const commit = () => {
      if (requestedRevision !== revision) {
        return
      }
      frame = undefined
      batch(() => {
        untrack(() => options.onCommit?.(next))
        setCommitted(() => next)
        setPending(false)
      })
    }
    frame = globalThis.requestAnimationFrame(() => {
      if (requestedRevision === revision) {
        frame = globalThis.requestAnimationFrame(commit)
      }
    })
  }
  onCleanup(cancel)
  return {committed, pending, reset, select, value}
}
