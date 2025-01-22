import {createMemo, createSignal, createUniqueId, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {DynamicParentProps} from 'src/types'
import {ScrollContext} from './scroll-context'
import {useScrollState} from './scroll-state'
import {ScrollBarType} from './types'

export interface WScrollRootProps extends DynamicParentProps {
  [key: string]: any
}

export const WScrollRoot = (_props: WScrollRootProps) => {
  const [props, restProps] = splitProps(_props, ['as'])
  const [scrollBodyElement, setScrollBodyElement] = createSignal<HTMLElement | null>(null)
  const nativeScrollState = useScrollState(scrollBodyElement)
  const scrollId = createUniqueId()
  const scrollValue = createMemo(() => {
    const state = nativeScrollState()
    const percentX =
      state.scrollLeft > 0
        ? state.scrollLeft / (state.scrollWidth - state.containerWidth)
        : 0
    const percentY =
      state.scrollTop > 0
        ? state.scrollTop / (state.scrollHeight - state.containerHeight)
        : 0
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
      <Dynamic {...restProps} component={props.as ?? 'div'} />
    </ScrollContext.Provider>
  )
}
