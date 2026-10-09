import {type Accessor, createEffect, on, onCleanup} from 'solid-js'

interface TreeSelectionScrollOptions {
  readonly element: Accessor<HTMLElement | null>
  readonly path: Accessor<string>
  readonly paths: Accessor<string[]>
}

interface TreeScrollTarget {
  readonly container: HTMLElement | null
  readonly path: string
  revealed: boolean
}

/** Reveals the opened file once per navigation or tree mount, after its row is rendered. */
export const useTreeSelectionScroll = (options: TreeSelectionScrollOptions): void => {
  let target: TreeScrollTarget | null = null
  createEffect(
    on([options.paths, options.path, options.element], ([, path, container]) => {
      if (target === null || target.path !== path || target.container !== container) {
        target = {container, path, revealed: false}
      }
      const current = target
      if (current.revealed || container === null) {
        return
      }
      let disposed = false
      onCleanup(() => {
        disposed = true
      })
      queueMicrotask(() => {
        if (!disposed) {
          const selected = container.querySelector('[aria-selected="true"]')
          if (selected !== null) {
            selected.scrollIntoView?.({block: 'nearest'})
            current.revealed = true
          }
        }
      })
    }),
  )
}
