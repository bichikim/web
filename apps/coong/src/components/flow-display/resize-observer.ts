import {MaybeAccessor, resolveAccessor} from '@winter-love/solid-use'
import {createEffect, onCleanup} from 'solid-js'

export const useResizeObserver = (
  target: MaybeAccessor<HTMLElement | null>,
  callback: ResizeObserverCallback,
) => {
  const resolvedTarget = resolveAccessor(target)

  createEffect(() => {
    const target = resolvedTarget()
    const observer = new ResizeObserver(callback)

    if (target) {
      observer.observe(target)
    }

    onCleanup(() => {
      observer.disconnect()
    })
  })
}
