import {createMemo, createSignal, ParentProps, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {ScrollBodyContext} from './scroll-body-context'
import {ScrollContext} from './scroll-context'
import {ScrollEventContext} from './scroll-event-context'
import {useScrollState} from './scroll-state'
import {scrollUuid} from './scroll-uuid'

export interface WScrollProps extends ParentProps {
  [key: string]: any

  /**
   * class recommended relative overflow-hidden
   */
  as?: string
  keepXBar?: boolean
  keepYBar?: boolean
}

export const WScroll = (_props: WScrollProps) => {
  const [props, restProps] = splitProps(_props, ['as', 'keepYBar', 'keepXBar'])

  const [scrollBodyElement, setScrollBodyElement] = createSignal<HTMLElement | null>(null)

  const nativeScrollState = useScrollState(scrollBodyElement)

  const scrollId = scrollUuid()

  const scrollContext = createMemo(() => {
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

  const setScroll = (type: 'x' | 'y', position: number) => {
    const element = scrollBodyElement()
    if (!element) {
      return
    }
    if (type === 'x') {
      element.scrollLeft = position
      return
    }
    element.scrollTop = position
  }

  const moveScroll = (type: 'x' | 'y', position: number) => {
    const element = scrollBodyElement()
    if (!element) {
      return
    }
    if (type === 'x') {
      element.scrollLeft += position
      return
    }
    element.scrollTop += position
  }

  return (
    <ScrollBodyContext.Provider value={[scrollBodyElement, setScrollBodyElement]}>
      <ScrollContext.Provider value={scrollContext}>
        <ScrollEventContext.Provider value={{moveScroll, setScroll}}>
          <Dynamic component={props.as ?? 'div'} {...restProps} />
        </ScrollEventContext.Provider>
      </ScrollContext.Provider>
    </ScrollBodyContext.Provider>
  )
}
