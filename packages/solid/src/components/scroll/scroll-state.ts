import {MayBeAccessor, resolveAccessor, useEvent} from '@winter-love/solid/use'
import {Accessor, createEffect, createSignal} from 'solid-js'
import {ScrollState} from './scroll-context'

/**
 * Whenever scrolls and elements are registered or changed, various scroll-related signal states are updated
 * @param element
 */
export const useScrollState = (
  element: MayBeAccessor<HTMLElement | null>,
): Accessor<ScrollState> => {
  const elementAccessor = resolveAccessor(element)
  const [nativeScrollState, setNativeScrollState] = createSignal<ScrollState>({
    containerHeight: 0,
    containerLeft: 0,
    containerTop: 0,
    containerWidth: 0,
    scrollHeight: 0,
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 0,
  })

  const updateScrollState = (element: HTMLElement | null) => {
    const {
      clientHeight: containerHeight = 0,
      clientWidth: containerWidth = 0,
      scrollHeight = 0,
      scrollWidth = 0,
      scrollLeft = 0,
      scrollTop = 0,
    } = element ?? {}

    const {top: containerTop = 0, left: containerLeft = 0} =
      element?.getBoundingClientRect() ?? {}

    setNativeScrollState({
      containerHeight,
      containerLeft,
      containerTop,
      containerWidth,
      scrollHeight,
      scrollLeft,
      scrollTop,
      scrollWidth,
    })
  }

  createEffect(() => {
    updateScrollState(elementAccessor())
  })

  useEvent(elementAccessor, 'scroll', () => {
    updateScrollState(elementAccessor())
  })

  return nativeScrollState
}
