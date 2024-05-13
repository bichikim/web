import {createMemo, mergeProps, ParentProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {
  BOTTOM_VAR,
  HEIGHT_VAR,
  LEFT_VAR,
  RIGHT_VAR,
  TOP_VAR,
  WIDTH_VAR,
} from 'src/components/css-var'
import {useScroll} from 'src/components/scroll/scroll-context'
import {ScrollBarContext} from './scroll-bar-context'
import {ScrollBarType, useScrollBarType} from './scroll-bar-type-context'
import {sx, ValidStyle} from 'src/use'

export interface WScrollBarProps extends ParentProps {
  as?: string
  /**
   * recommend left-var top-var bottom-var right-var w-var h-var absolute
   */
  class?: string
  style?: ValidStyle
  /**
   * @default 0.5rem
   */
  thickness?: string
  type?: ScrollBarType
}

export const WScrollBar = (_props: WScrollBarProps) => {
  const scrollBarType = useScrollBarType()
  const props = mergeProps({as: 'div', thickness: '0.5rem', type: scrollBarType}, _props)
  const scroll = useScroll()

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
    } = scroll()

    if (props.type === 'horizontal') {
      return {
        containerPosition: containerLeft,
        containerSize: containerWidth,
        percent: percentX,
        scrollId: id,
        scrollPosition: scrollLeft,
        scrollSize: scrollWidth,
      }
    }
    return {
      containerPosition: containerTop,
      containerSize: containerHeight,
      percent: percentY,
      scrollId: id,
      scrollPosition: scrollTop,
      scrollSize: scrollHeight,
    }
  })

  const scrollBarStyle = createMemo(() => {
    if (props.type === 'horizontal') {
      return {
        [BOTTOM_VAR]: '0',
        [HEIGHT_VAR]: props.thickness,
        [LEFT_VAR]: '0',
        [WIDTH_VAR]: '100%',
      }
    }
    return {
      [HEIGHT_VAR]: '100%',
      [RIGHT_VAR]: '0',
      [TOP_VAR]: '0',
      [WIDTH_VAR]: props.thickness,
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
    const {containerSize, percent} = scrollBarContext()
    const clickPercent = event.offsetY / containerSize
    console.log('click', percent, clickPercent)
  }

  return (
    <ScrollBarContext.Provider value={scrollBarContext}>
      <Dynamic
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
