import {type Accessor, createRenderEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {uniq} from 'es-toolkit/array'

type ResizeObserverTarget = Element | null | undefined

export interface UseResizeObserverProps {
  readonly onResize: ResizeObserverCallback
  readonly target: Accessor<ResizeObserverTarget | ReadonlyArray<ResizeObserverTarget>>
}

export interface ResizeObserverControls {
  readonly start: () => void
  readonly stop: () => void
}

/** Observes current targets only after start; stop and owner disposal disconnect. Missing targets or capability are no-ops. */
export const useResizeObserver = (props: UseResizeObserverProps): ResizeObserverControls => {
  const [active, setActive] = createSignal(false)
  let observer: ResizeObserver | undefined
  let disposed = false

  const disconnect = () => {
    observer?.disconnect()
    observer = undefined
  }
  const start = () => {
    if (!disposed) {
      setActive(true)
    }
  }
  const stop = () => {
    disconnect()
    setActive(false)
  }

  createRenderEffect(() => {
    if (!active()) {
      return
    }
    const target = props.target()
    const targets = uniq(Array.isArray(target) ? target : [target]).filter(
      (element): element is Element => element !== null && element !== undefined,
    )
    if (targets.length === 0 || typeof globalThis.ResizeObserver === 'undefined') {
      return
    }
    const current = new globalThis.ResizeObserver((entries, source) => {
      untrack(() => {
        if (active() && observer === current) {
          props.onResize(entries, source)
        }
      })
    })
    observer = current
    onCleanup(disconnect)
    for (const element of targets) {
      current.observe(element)
    }
  })

  onCleanup(() => {
    disposed = true
    stop()
  })

  return {start, stop}
}
