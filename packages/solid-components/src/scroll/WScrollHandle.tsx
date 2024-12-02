import {DragType, stopPropagation, sx, useDrag} from '@winter-love/solid-use'
import {createMemo, createSignal, mergeProps, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {DynamicParentProps} from 'src/types'
import {POSITION_VAR, SIZE_VAR} from '../css-var'
import {useScrollBar} from './scroll-bar-context'
import {useScrollContext} from './scroll-context'

export interface WScrollHandleProps extends DynamicParentProps {
  //
}

export const WScrollHandle = (_props: WScrollHandleProps) => {
  const [props, restProps] = splitProps(mergeProps({as: 'div'}, _props), [
    'as',
    'style',
    'children',
    'class',
  ])
  const scrollBar = useScrollBar()

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
    const {barPosition, barSize} = handleValues()

    return {
      [POSITION_VAR]: `${barPosition}px`,
      [SIZE_VAR]: `${barSize}px`,
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
