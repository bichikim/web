import {sx, useStyles, StyleType} from '@winter-love/solid-use'
import {createMemo, splitProps, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {X_PERCENT_VAR, Y_PERCENT_VAR} from 'src/css-var'
import {useScrollContext} from './scroll-context'

interface InnerProps {
  style?: StyleType
}

export type WScrollBodyProps<T extends ValidComponent> = InnerProps & DynamicProps<T>

export const WScrollBody = <T extends ValidComponent>(props: WScrollBodyProps<T>) => {
  const {setScrollBodyElement, value: ScrollValue} = useScrollContext()
  const scrollId = createMemo(() => ScrollValue().id)

  const [innerProps, restProps] = splitProps(props, ['style']) as unknown as [InnerProps, DynamicProps<T>]

  const percentStyle = createMemo(() => {
    const {percentX, percentY} = ScrollValue()

    return {
      [X_PERCENT_VAR]: percentX,
      [Y_PERCENT_VAR]: percentY,
    }
  })

  const style = useStyles(() => [percentStyle(), innerProps.style])

  return (
    <Dynamic {...restProps} style={style()} id={scrollId()} ref={setScrollBodyElement}>
      {props.children}
    </Dynamic>
  )
}
