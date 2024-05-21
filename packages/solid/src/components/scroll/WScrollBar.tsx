import {sx, ValidStyle} from '@winter-love/solid/use'
import {createMemo, mergeProps, ParentProps, Show, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {
  BAR_PERCENT,
  BOTTOM_VAR,
  HEIGHT_VAR,
  LEFT_VAR,
  RIGHT_VAR,
  TOP_VAR,
  WIDTH_VAR,
} from 'src/components/css-var'
import {ScrollBarContext} from './scroll-bar-context'
import {useScrollContext} from './scroll-context'
import {ScrollBarType} from './types'
import {DynamicParentProps} from 'src/components/types'

export interface WScrollBarProps extends DynamicParentProps {
  [key: string]: any
  as?: string
  /**
   * recommend left-var top-var bottom-var right-var w-var h-var absolute
   */
  class?: string
  style?: ValidStyle

  type?: ScrollBarType
}

export const WScrollBar = (_props: WScrollBarProps) => {
  const [props, restProps] = splitProps(
    mergeProps({as: 'div', type: 'vertical' as const}, _props),
    ['as', 'thickness', 'type', 'class', 'style', 'children'],
  )
  const scrollContext = useScrollContext()
  const scrollBarState = createMemo(() => {
    const {
      containerLeft,
      containerHeight,
      scrollLeft,
      scrollTop,
      scrollHeight,
      containerTop,
      containerWidth,
      id,
      scrollWidth,
      percentX,
      percentY,
      showXBar,
      showYBar,
    } = scrollContext.value()

    if (props.type === 'horizontal') {
      return {
        containerPosition: containerLeft,
        containerSize: containerWidth,
        percent: percentX,
        scrollId: id,
        scrollPosition: scrollLeft,
        scrollSize: scrollWidth,
        show: showXBar,
      }
    }
    return {
      containerPosition: containerTop,
      containerSize: containerHeight,
      percent: percentY,
      scrollId: id,
      scrollPosition: scrollTop,
      scrollSize: scrollHeight,
      show: showYBar,
    }
  })

  const scrollBarStyle = createMemo(() => {
    const {percent, show} = scrollBarState()
    if (props.type === 'horizontal') {
      return {
        [BAR_PERCENT]: percent,
        [BOTTOM_VAR]: '0',
        [LEFT_VAR]: '0',
        [WIDTH_VAR]: '100%',
      }
    }
    return {
      [BAR_PERCENT]: percent,
      [HEIGHT_VAR]: '100%',
      [RIGHT_VAR]: '0',
      [TOP_VAR]: '0',
    }
  })

  const scrollBarContext = createMemo(() => {
    const state = scrollBarState()
    return {
      ...state,
      type: props.type,
    }
  })

  const onClick = (event: MouseEvent) => {
    const type = props.type ?? 'horizontal'
    const {containerSize, scrollSize} = scrollBarContext()
    const clickPosition = type === 'horizontal' ? event.offsetX : event.offsetY
    const clickedPercent = clickPosition / containerSize
    scrollContext.setScroll(props.type, (scrollSize - containerSize) * clickedPercent)
  }

  return (
    <ScrollBarContext.Provider value={scrollBarContext}>
      <Dynamic
        {...restProps}
        data-show={scrollBarState().show}
        component={props.as}
        class={props.class}
        style={sx(scrollBarStyle(), props.style)}
        onClick={onClick}
      >
        {props.children}
      </Dynamic>
    </ScrollBarContext.Provider>
  )
}
