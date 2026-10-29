import {type Accessor, createEffect, onCleanup, untrack} from 'solid-js'
import {useFileViewState} from './view-state/context'
import type {ScrollPosition} from './view-state/types'

interface UseScrollRestorationProps {
  readonly element: Accessor<HTMLElement | null>
  readonly content: Accessor<unknown>
  readonly kind: 'codeScroll' | 'previewScroll'
  readonly onLocate?: (element: HTMLElement) => void
}
/** Restores a file viewport after its content is ready and records scroll events. */
export const useScrollRestoration = (props: UseScrollRestorationProps) => {
  const state = useFileViewState()
  const record = (): void => {
    const element = props.element()
    if (element !== null) {
      const position: ScrollPosition = {left: element.scrollLeft, top: element.scrollTop}
      state?.update({[props.kind]: position})
    }
  }
  onCleanup(record)
  createEffect(() => {
    props.content()
    state?.request()
    const element = props.element()
    if (element === null) {
      return
    }
    const position = untrack(() => state?.read()?.[props.kind])
    let disposed = false
    onCleanup(() => {
      disposed = true
    })
    queueMicrotask(() => {
      if (!disposed) {
        if (position === undefined) {
          untrack(() => props.onLocate?.(element))
          record()
        } else {
          element.scrollTop = position.top
          element.scrollLeft = position.left
        }
      }
    })
  })
  return {record}
}
