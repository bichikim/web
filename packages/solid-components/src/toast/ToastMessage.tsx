import {ToastContentContext} from './context'
import {mergeProps, splitProps, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type ToastMessageProps<T extends ValidComponent> = Partial<DynamicProps<T>>

export const ToastMessage = <T extends ValidComponent>(props: ToastMessageProps<T>) => {
  const defaultProps = mergeProps({component: 'span'}, props)
  const [innerProps, restProps] = splitProps(defaultProps as any, ['component'])
  const {message} = useContext(ToastContentContext)

  return (
    <Dynamic component={innerProps.component} {...restProps}>
      {message.message}
    </Dynamic>
  )
}
