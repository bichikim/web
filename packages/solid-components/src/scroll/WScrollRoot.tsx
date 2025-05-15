import {createMemo, createSignal, createUniqueId, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {ScrollContext} from './scroll-context'
import {useScrollState} from './scroll-state'
import {ScrollBarType} from './types'

export type WScrollRootProps<T extends ValidComponent> = DynamicProps<T>

export const WScrollRoot = <T extends ValidComponent>(props: WScrollRootProps<T>) => {
  const [scrollBodyElement, setScrollBodyElement] = createSignal<HTMLElement | null>(null)
  const nativeScrollState = useScrollState(scrollBodyElement)
  const scrollId = createUniqueId()

  const scrollValue = createMemo(() => {
    const state = nativeScrollState()

    const percentX = state.scrollLeft > 0 ? state.scrollLeft / (state.scrollWidth - state.containerWidth) : 0

    const percentY = state.scrollTop > 0 ? state.scrollTop / (state.scrollHeight - state.containerHeight) : 0
    const showXBar = state.scrollWidth > state.containerWidth
    const showYBar = state.scrollHeight > state.containerHeight

    return {
      ...state,
      id: scrollId,
      percentX,
      percentY,
      showXBar,
      showYBar,
    }
  })

  const setScroll = (type: ScrollBarType, position: number) => {
    const element = scrollBodyElement()

    if (!element) {
      return
    }

    if (type === 'horizontal') {
      element.scrollLeft = position

      return
    }

    element.scrollTop = position
  }

  const moveScroll = (type: ScrollBarType, position: number) => {
    const element = scrollBodyElement()

    if (!element) {
      return
    }

    if (type === 'horizontal') {
      element.scrollLeft += position

      return
    }

    element.scrollTop += position
  }

  return (
    <ScrollContext.Provider
      value={{
        moveScroll,
        setScroll,
        setScrollBodyElement,
        value: scrollValue,
      }}
    >
      <Dynamic {...props} />
    </ScrollContext.Provider>
  )
}
