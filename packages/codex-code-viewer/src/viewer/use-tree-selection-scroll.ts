import {type Accessor, createEffect, createSignal, on, onCleanup} from 'solid-js'

interface UseTreeSelectionScrollProps {
  readonly element: Accessor<HTMLElement | null>
  readonly path: Accessor<string>
  readonly paths: Accessor<string[]>
}

interface TreeScrollTarget {
  readonly container: HTMLElement | null
  readonly path: string
  readonly revision: number
  revealed: boolean
}

/** Reveals the opened file on navigation, tree mount, or an explicit request after its row renders. */
export const useTreeSelectionScroll = (props: UseTreeSelectionScrollProps): (() => void) => {
  const [revision, setRevision] = createSignal(0)
  let target: TreeScrollTarget | null = null
  createEffect(
    on([props.paths, props.path, props.element, revision], ([, path, container, revision]) => {
      if (
        target === null ||
        target.path !== path ||
        target.container !== container ||
        target.revision !== revision
      ) {
        target = {container, path, revealed: false, revision}
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
  return () => setRevision((previous) => previous + 1)
}
