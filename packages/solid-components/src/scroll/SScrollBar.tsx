import {useStyles} from '@winter-love/solid-use'
import {createMemo, type JSX, mergeProps, type ValidComponent} from 'solid-js'
import {createDynamic} from 'solid-js/web'
import {PERCENT_VAR} from '../css-var'
import {ScrollBarContext} from './scroll-bar-context'
import {useScrollContext} from './scroll-context'
import {ScrollBarType} from './types'
import {callEventHandler, type ComponentTargetProps} from '../utils'

interface InnerProps {
  barType?: ScrollBarType
  thickness?: string
}

export type SScrollBarProps<T extends ValidComponent> = InnerProps & ComponentTargetProps<T>

export const SScrollBar = <T extends ValidComponent>(props: SScrollBarProps<T>) => {
  const barType = () => props.barType ?? 'vertical'
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

    if (barType() === 'horizontal') {
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
      type: barType(),
    }
  })

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    const type = barType()
    const {containerSize, scrollSize} = scrollBarContext()
    const clickPosition = type === 'horizontal' ? event.offsetX : event.offsetY
    const clickedPercent = clickPosition / containerSize

    scrollContext.setScroll(type, (scrollSize - containerSize) * clickedPercent)
    callEventHandler(props.componentProps?.onClick, event)
  }

  const style = useStyles(() => [scrollBarStyle(), props.componentProps?.style])
  // oxlint-disable-next-line solid/reactivity -- Solid tracks mergeProps function sources; replacement is covered by tests.
  const targetProps = mergeProps(() => props.componentProps, {
    // Empty JSX children must not fall through mergeProps to target children.
    get children() {
      return 'children' in props ? (props.children ?? null) : props.componentProps?.children
    },
    get 'data-show'() {
      return scrollBarState().show
    },
    onClick: handleClick,
    get style() {
      return style()
    },
  })

  return (
    <ScrollBarContext.Provider value={scrollBarContext}>
      {createDynamic<T | 'div'>(() => props.component ?? 'div', targetProps)}
    </ScrollBarContext.Provider>
  )
}
