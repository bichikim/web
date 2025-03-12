import {ToastActionContext} from './context'
import {createMemo, mergeProps, splitProps, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type ToastActionProps<T extends ValidComponent> = Partial<DynamicProps<T>>

export const ToastAction = <T extends ValidComponent>(props: ToastActionProps<T>) => {
  const defaultProps = mergeProps({component: 'button'}, props)
  const [innerProps, restProps] = splitProps(defaultProps as any, ['component'])
  const action = useContext(ToastActionContext)

  const handleClick = () => {
    if (action.type !== 'click') {
      return
    }

    action.action?.()

    if (action.actionToClose) {
      action.onClose?.()
    }
  }

  const receivedProps = createMemo(() => {
    return action.props
  })

  return (
    <Dynamic
      component={innerProps.component}
      {...restProps}
      {...receivedProps}
      onClick={handleClick}
    >
      {action.label}
    </Dynamic>
  )
}
