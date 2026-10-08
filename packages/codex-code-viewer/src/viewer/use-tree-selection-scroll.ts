import {type Accessor, createEffect, on, onCleanup} from 'solid-js'

interface TreeSelectionScrollOptions {
  readonly element: Accessor<HTMLElement | null>
  readonly path: Accessor<string>
  readonly paths: Accessor<string[]>
}

/** Scrolls the selected tree item into view after its rendered list changes. */
export const useTreeSelectionScroll = (options: TreeSelectionScrollOptions): void => {
  createEffect(
    on([options.paths, options.path, options.element], () => {
      const container = options.element()
      let disposed = false
      onCleanup(() => {
        disposed = true
      })
      queueMicrotask(() => {
        if (!disposed) {
          container?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({block: 'nearest'})
        }
      })
    }),
  )
}
