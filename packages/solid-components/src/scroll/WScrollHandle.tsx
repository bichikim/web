import {DragType, stopPropagation, useStyles, useDrag, StyleType} from '@winter-love/solid-use'
import {createMemo, createSignal, splitProps, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {POSITION_VAR, SIZE_VAR} from '../css-var'
import {useScrollBar} from './scroll-bar-context'
import {useScrollContext} from './scroll-context'

interface InnerProps {
  style?: StyleType
}

export type WScrollHandleProps<T extends ValidComponent> = InnerProps & DynamicProps<T>

export const WScrollHandle = <T extends ValidComponent>(props: WScrollHandleProps<T>) => {
  const scrollBar = useScrollBar()
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const scrollContext = useScrollContext()
  const [barState, setBarState] = createSignal<DragType>('end')

  const [innerProps, restProps] = splitProps(props, ['style']) as unknown as [InnerProps, DynamicProps<T>]

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
    const {x: clientX, y: clientY} = payload.currentPoint
    const {x: relativeX, y: relativeY} = payload.relativePoint
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

    setScroll(Math.max(nextScrollPosition, 0))
  })

  const style = useStyles(() => [handleStyle(), innerProps.style])

  return (
    <Dynamic
      tabindex="0"
      {...restProps}
      ref={setElement}
      data-state={barState()}
      aria-controls={scrollBar().scrollId}
      aria-valuenow={scrollBar().scrollPosition}
      aria-valuemin="0"
      aria-valuemax={scrollBar().scrollSize}
      role="scrollbar"
      style={style()}
      onClick={stopPropagation()}
    >
      {props.children}
    </Dynamic>
  )
}
