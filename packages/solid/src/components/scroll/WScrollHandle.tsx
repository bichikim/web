import {DragType, stopPropagation, sx, useDrag, ValidStyle} from '@winter-love/solid/use'
import {createMemo, createSignal, mergeProps, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {DynamicParentProps} from 'src/components/types'
import {
  BAR_PERCENT,
  BOTTOM_VAR,
  HEIGHT_VAR,
  LEFT_VAR,
  RIGHT_VAR,
  TOP_VAR,
  WIDTH_VAR,
} from '../css-var'
import {useScrollBar} from './scroll-bar-context'
import {useScrollContext} from './scroll-context'

export interface WScrollHandleProps extends DynamicParentProps {
  [key: string]: any

  as?: string
  class?: string

  style?: ValidStyle
}

export const WScrollHandle = (_props: WScrollHandleProps) => {
  const [props, restProps] = splitProps(mergeProps({as: 'div'}, _props), [
    'as',
    'style',
    'children',
    'class',
  ])
  const scrollBar = useScrollBar()
  // const [pointerDown, setPointerDown] = createSignal(false)

  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const scrollContext = useScrollContext()
  const [barState, setBarState] = createSignal<DragType>('end')

  const handleValues = createMemo(() => {
    const {containerSize, scrollSize, percent} = scrollBar()
    const barSize = scrollSize > 0 ? (containerSize / scrollSize) * containerSize : 0
    const barPosition = (containerSize - barSize) * percent

    return {
      barPosition,
      barSize,
      percent,
    }
  })

  const handleStyle = createMemo(() => {
    const {barPosition, barSize, percent} = handleValues()
    const {type} = scrollBar()

    if (type === 'horizontal') {
      return {
        [BAR_PERCENT]: percent,
        [BOTTOM_VAR]: '0',
        // [HEIGHT_VAR]: '100%',
        [LEFT_VAR]: `${barPosition}px`,
        [WIDTH_VAR]: `${barSize}px`,
      }
    }

    return {
      [BAR_PERCENT]: percent,
      [HEIGHT_VAR]: `${barSize}px`,
      [RIGHT_VAR]: '0',
      [TOP_VAR]: `${barPosition}px`,
      // [WIDTH_VAR]: '100%',
    }
  })
  const setScroll = (position: number) => {
    const {type} = scrollBar()
    scrollContext.setScroll(type, position)
  }
  useDrag(element, (type, payload) => {
    setBarState(type)
    if (type !== 'move') {
      return
    }
    const {type: barType} = scrollBar()
    const [clientX, clientY] = payload.currentPoint
    const [relativeX, relativeY] = payload.relativePoint
    const relativePoint = barType === 'horizontal' ? relativeX : relativeY

    const bodyElement = element()
    const {barSize} = handleValues()
    const {containerSize, scrollSize, containerPosition} = scrollBar()
    if (!bodyElement) {
      return
    }
    const currentPoint = barType === 'horizontal' ? clientX : clientY
    const targetPoint = currentPoint - containerPosition - relativePoint
    const pointPercent = targetPoint / (containerSize - barSize)
    const nextScrollPosition = (scrollSize - containerSize) * pointPercent
    setScroll(nextScrollPosition < 0 ? 0 : nextScrollPosition)
  })

  return (
    <Dynamic
      tabindex="0"
      {...restProps}
      ref={setElement}
      component={props.as}
      data-state={barState()}
      aria-controls={scrollBar().scrollId}
      aria-valuenow={scrollBar().scrollPosition}
      aria-valuemin="0"
      aria-valuemax={scrollBar().scrollSize}
      role="scrollbar"
      style={sx(handleStyle(), props.style)}
      class={props.class}
      onClick={stopPropagation()}
    >
      {props.children}
    </Dynamic>
  )
}
