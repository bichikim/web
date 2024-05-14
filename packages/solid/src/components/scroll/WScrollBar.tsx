import {createMemo, mergeProps, ParentProps, Show} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {
  BOTTOM_VAR,
  HEIGHT_VAR,
  LEFT_VAR,
  RIGHT_VAR,
  TOP_VAR,
  WIDTH_VAR,
} from 'src/components/css-var'
import {sx, ValidStyle} from 'src/use'
import {ScrollBarContext} from './scroll-bar-context'
import {useScrollContext} from './scroll-context'
import {ScrollBarType} from './types'
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
  const props = mergeProps(
    {as: 'div', thickness: '0.5rem', type: 'vertical' as const},
    _props,
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
    } = scrollContext()

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
    <Show when={scrollBarState().show}>
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
    </Show>
  )
}
