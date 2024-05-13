import {createUuid} from '@winter-love/utils'
import {
  createMemo,
  createSignal,
  JSXElement,
  mergeProps,
  onMount,
  ParentProps,
  Show,
  ValidComponent,
} from 'solid-js'
import {ScrollContext, ScrollState} from './scroll-context'
import {ScrollEventContext} from './scroll-event-context'
import {ScrollBarTypeContext} from './scroll-bar-type-context'
import {Dynamic} from 'solid-js/web'
import {SCROLL_X_PERCENT, SCROLL_Y_PERCENT} from 'src/components/css-var'
import {sx, ValidStyle} from 'src/use'

const uuid = createUuid()
const scrollUuid = () => {
  return `__scroll_${uuid()}`
}

export interface WScrollProps extends ParentProps {
  as?: ValidComponent
  /**
   * recommend overflow-auto relative w-full h-full scrollbar-none
   */
  class?: string
  keepXBar?: boolean
  keepYBar?: boolean
  style?: ValidStyle
  xBar?: JSXElement
  yBar?: JSXElement
}

export const WScrollBody = (_props: WScrollProps) => {
  const props = mergeProps({as: 'div'}, _props)
  const [scrollElement, setScrollElement] = createSignal<HTMLElement>()
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

  const scrollId = scrollUuid()

  const updateScrollState = () => {
    const element = scrollElement()
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

  onMount(() => {
    updateScrollState()
  })

  const showYBar = createMemo(() => {
    const {containerHeight, scrollHeight} = nativeScrollState()
    return props.keepYBar || scrollHeight > containerHeight
  })

  const showXBar = createMemo(() => {
    const {containerWidth, scrollWidth} = nativeScrollState()
    return props.keepXBar || scrollWidth > containerWidth
  })

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
    return {
      ...state,
      id: scrollId,
      percentX,
      percentY,
    }
  })

  const onScroll = () => {
    updateScrollState()
  }

  const onScrollX = (position: number) => {
    const element = scrollElement()
    if (element) {
      element.scrollLeft = position
    }
  }

  const onScrollY = (position: number) => {
    const element = scrollElement()
    if (element) {
      element.scrollTop = position
    }
  }

  const style = createMemo(() => {
    const {percentX, percentY} = scrollContext()

    return {
      [SCROLL_X_PERCENT]: percentX,
      [SCROLL_Y_PERCENT]: percentY,
    }
  })

  const scrollEventContext = {onScrollX, onScrollY}

  return (
    <ScrollContext.Provider value={scrollContext}>
      <ScrollEventContext.Provider value={scrollEventContext}>
        <Dynamic
          style={sx(style(), props.style)}
          component={props.as}
          id={scrollId}
          ref={setScrollElement}
          class={props.class}
          onScroll={onScroll}
        >
          {props.children}
        </Dynamic>
        <ScrollBarTypeContext.Provider value="vertical">
          <Show when={showYBar()}>{props.yBar}</Show>
        </ScrollBarTypeContext.Provider>
        <ScrollBarTypeContext.Provider value="horizontal">
          <Show when={showXBar()}>{props.xBar}</Show>
        </ScrollBarTypeContext.Provider>
      </ScrollEventContext.Provider>
    </ScrollContext.Provider>
  )
}
