import {getWindow} from '@winter-love/utils'
import {createMemo, createSignal, mergeProps, ParentProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {useEvent} from 'src/use/event'
import {BOTTOM_VAR, HEIGHT_VAR, LEFT_VAR, RIGHT_VAR, TOP_VAR, WIDTH_VAR} from '../css-var'
import {useScrollBar} from './scroll-bar-context'
import {useScrollEvent} from './scroll-event-context'
import {stopPropagation, sx, ValidStyle} from 'src/use'

export interface WScrollBarProps extends ParentProps {
  as?: string
  class?: string
  style?: ValidStyle
}

export const WScrollHandel = (_props: WScrollBarProps) => {
  const props = mergeProps({as: 'div'}, _props)
  const scrollBar = useScrollBar()
  let pointerDown = false
  let startDragPoint = 0

  const [element, setElement] = createSignal<HTMLElement>()

  const {onScrollX, onScrollY} = useScrollEvent()

  const handleValues = createMemo(() => {
    const {containerSize, scrollPosition, scrollSize} = scrollBar()
    const barSize = scrollSize > 0 ? (containerSize / scrollSize) * containerSize : 0
    const barSizeNoneOverflow = barSize > containerSize ? containerSize : barSize
    const percent = scrollPosition > 0 ? scrollPosition / (scrollSize - containerSize) : 0
    const barPosition = (containerSize - barSize) * percent

    return {
      barPosition,
      barSize: barSizeNoneOverflow,
      percent,
    }
  })

  const handleStyle = createMemo(() => {
    const {barPosition, barSize} = handleValues()
    const {type} = scrollBar()

    if (type === 'horizontal') {
      return {
        [BOTTOM_VAR]: '0',
        [HEIGHT_VAR]: '100%',
        [LEFT_VAR]: `${barPosition}px`,
        [TOP_VAR]: 'unset',
        [WIDTH_VAR]: `${barSize}px`,
      }
    }

    return {
      [HEIGHT_VAR]: `${barSize}px`,
      [LEFT_VAR]: 'unset',
      [RIGHT_VAR]: '0',
      [TOP_VAR]: `${barPosition}px`,
      [WIDTH_VAR]: '100%',
    }
  })

  useEvent(element, 'pointerdown', (event) => {
    const {type} = scrollBar()
    startDragPoint = type === 'horizontal' ? event.offsetX : event.offsetY
    pointerDown = true
  })

  useEvent(getWindow, 'pointerup', () => {
    pointerDown = false
  })

  useEvent(getWindow, 'pointermove', (event: PointerEvent) => {
    const {type} = scrollBar()
    const onScroll = type === 'horizontal' ? onScrollX : onScrollY
    const bodyElement = element()
    const {barSize} = handleValues()
    const {containerSize, scrollSize, containerPosition} = scrollBar()
    if (!pointerDown || !bodyElement) {
      return
    }
    const currentPoint = type === 'horizontal' ? event.clientX : event.clientY
    const targetPoint = currentPoint - containerPosition - startDragPoint
    const pointPercent = targetPoint / (containerSize - barSize)
    const nextScrollPosition = (scrollSize - containerSize) * pointPercent
    onScroll(nextScrollPosition < 0 ? 0 : nextScrollPosition)
  })

  return (
    <Dynamic
      ref={setElement}
      component={props.as}
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
