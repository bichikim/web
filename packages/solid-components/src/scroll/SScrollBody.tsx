import {callEventHandler} from '../utils/event-handler'
import {StyleType, sx, useStyles} from '@winter-love/solid-use'
import {createMemo, type JSX, splitProps, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {X_PERCENT_VAR, Y_PERCENT_VAR} from '../css-var'
import {useScrollContext} from './scroll-context'

interface InnerProps {
  onScroll?: JSX.EventHandlerUnion<HTMLElement, Event> | undefined
  style?: StyleType
}

export type SScrollBodyProps<T extends ValidComponent> = InnerProps & DynamicProps<T>

export const SScrollBody = <T extends ValidComponent>(props: SScrollBodyProps<T>) => {
  const {onScroll, setScrollBodyElement, value: ScrollValue} = useScrollContext()
  const scrollId = createMemo(() => ScrollValue().id)

  const [innerProps, restProps] = splitProps(props, ['style', 'onScroll']) as unknown as [
    InnerProps,
    DynamicProps<T>,
  ]

  const percentStyle = createMemo(() => {
    const {percentX, percentY} = ScrollValue()

    return {
      [X_PERCENT_VAR]: percentX,
      [Y_PERCENT_VAR]: percentY,
    }
  })

  const style = useStyles(() => [percentStyle(), innerProps.style])

  return (
    <Dynamic
      {...restProps}
      style={style()}
      id={scrollId()}
      ref={setScrollBodyElement}
      onScroll={(event) => {
        onScroll()
        callEventHandler(innerProps.onScroll, event)
      }}
    >
      {props.children}
    </Dynamic>
  )
}
