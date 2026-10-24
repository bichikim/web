import {ToastContentContext} from './context'
import {mergeProps, Show, splitProps, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type ToastTitleProps<T extends ValidComponent> = Partial<DynamicProps<T>>

export const ToastTitle = <T extends ValidComponent>(props: ToastTitleProps<T>) => {
  const defaultProps = mergeProps({component: 'span'}, props)
  const [innerProps, restProps] = splitProps(defaultProps as any, ['component'])
  const {message} = useContext(ToastContentContext)

  return (
    <Show when={message.title}>
      <Dynamic component={innerProps.component} {...restProps}>
        {message.title}
      </Dynamic>
    </Show>
  )
}
