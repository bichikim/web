import {useStyles, StyleType} from '@winter-love/solid-use'
import {createMemo, mergeProps, splitProps, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {PERCENT_VAR} from '../css-var'
import {ScrollBarContext} from './scroll-bar-context'
import {useScrollContext} from './scroll-context'
import {ScrollBarType} from './types'

type InnerProps = {
  barType?: ScrollBarType
  style?: StyleType
  thickness?: string
}

export type WScrollBarProps<T extends ValidComponent> = InnerProps & DynamicProps<T>

export const WScrollBar = <T extends ValidComponent>(props: WScrollBarProps<T>) => {
  const defaultProps = mergeProps({barType: 'vertical' as const, component: 'div'}, props)

  const [innerProps, restProps] = splitProps(defaultProps, ['thickness', 'barType', 'style']) as unknown as [
    Required<InnerProps>,
    DynamicProps<T>,
  ]
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

    if (innerProps.barType === 'horizontal') {
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
    const {percent} = scrollBarState()

    return {
      [PERCENT_VAR]: percent,
    }
  })

  const scrollBarContext = createMemo(() => {
    const state = scrollBarState()

    return {
      ...state,
      type: innerProps.barType,
    }
  })

  const onClick = (event: MouseEvent) => {
    const type = innerProps.barType ?? 'horizontal'
    const {containerSize, scrollSize} = scrollBarContext()
    const clickPosition = type === 'horizontal' ? event.offsetX : event.offsetY
    const clickedPercent = clickPosition / containerSize

    scrollContext.setScroll(innerProps.barType, (scrollSize - containerSize) * clickedPercent)
  }

  const style = useStyles(() => [scrollBarStyle(), innerProps.style])

  return (
    <ScrollBarContext.Provider value={scrollBarContext}>
      <Dynamic {...restProps} data-show={scrollBarState().show} style={style()} onClick={onClick} />
    </ScrollBarContext.Provider>
  )
}
