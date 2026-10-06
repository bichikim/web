import {type Accessor, createEffect, createSignal} from 'solid-js'
import {useResizeObserver} from 'src/hooks/use-resize-observer'

export interface HorizontalScrollHintsOptions {
  readonly target: Accessor<HTMLElement | null | undefined>
  readonly ratio: number
  readonly behavior?: ScrollBehavior
}

/** Tracks horizontal overflow and scrolls by the caller's page ratio and behavior. */
export const useHorizontalScrollHints = (options: HorizontalScrollHintsOptions) => {
  const [canScrollLeft, setCanScrollLeft] = createSignal(false)
  const [canScrollRight, setCanScrollRight] = createSignal(false)
  const update = () => {
    const element = options.target()
    setCanScrollLeft(element !== null && element !== undefined && element.scrollLeft > 1)
    setCanScrollRight(
      element !== null &&
        element !== undefined &&
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    )
  }
  const resize = useResizeObserver({onResize: update, target: options.target})
  resize.start()
  createEffect(update)
  const scrollByPage = (direction: -1 | 1) => {
    const element = options.target()
    element?.scrollBy({
      ...(options.behavior === undefined ? {} : {behavior: options.behavior}),
      left: direction * element.clientWidth * options.ratio,
    })
  }
  return {canScrollLeft, canScrollRight, onScroll: update, scrollByPage}
}
