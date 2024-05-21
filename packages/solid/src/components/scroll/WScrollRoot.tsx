import {createMemo, createSignal, ParentProps, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {ScrollContext} from './scroll-context'
import {useScrollState} from './scroll-state'
import {scrollUuid} from './scroll-uuid'
import {ScrollBarType} from './types'

export interface WScrollRootProps extends ParentProps {
  [key: string]: any

  /**
   * class recommended relative overflow-hidden
   */
  as?: string
  keepXBar?: boolean
  keepYBar?: boolean
}

export const WScrollRoot = (_props: WScrollRootProps) => {
  const [props, restProps] = splitProps(_props, ['as', 'keepYBar', 'keepXBar'])

  const [scrollBodyElement, setScrollBodyElement] = createSignal<HTMLElement | null>(null)

  const nativeScrollState = useScrollState(scrollBodyElement)

  const scrollId = scrollUuid()

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

    const showXBar = props.keepXBar || state.scrollWidth > state.containerWidth
    const showYBar = props.keepYBar || state.scrollHeight > state.containerHeight

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
      <Dynamic component={props.as ?? 'div'} {...restProps} />
    </ScrollContext.Provider>
  )
}
