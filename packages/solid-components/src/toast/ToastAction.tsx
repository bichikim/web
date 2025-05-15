import {MutableMessageAction, ToastActionContext} from './context'
import {createMemo, createSignal, mergeProps, splitProps, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'

export type ToastActionProps<T extends ValidComponent> = Partial<DynamicProps<T>>

export const ToastAction = <T extends ValidComponent>(props: ToastActionProps<T>) => {
  const defaultProps = mergeProps({component: 'button'}, props)
  const [innerProps, restProps] = splitProps(defaultProps as any, ['component'])
  const action = useContext(ToastActionContext)

  const [mutableState, setMutableState] = createSignal<MutableMessageAction>({
    label: action.label,
    props: action.props,
  })

  const handleClose = () => {
    action.onClose?.()
  }

  const handleClick = () => {
    if (action.type !== 'click') {
      return
    }

    action.action?.({close: handleClose, setAction: setMutableState})

    if (action.actionToClose) {
      handleClose()
    }
  }

  const receivedProps = createMemo(() => {
    return mutableState().props ?? action.props
  })

  const receivedLabel = createMemo(() => {
    return mutableState().label ?? action.label
  })

  return (
    <Dynamic component={innerProps.component} {...restProps} {...receivedProps} onClick={handleClick}>
      {receivedLabel()}
    </Dynamic>
  )
}
