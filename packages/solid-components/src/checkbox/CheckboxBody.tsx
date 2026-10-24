import {JSX, ParentProps, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {CheckboxContext} from './context'

export type CheckboxBodyProps<T extends ValidComponent> = DynamicProps<T> & ParentProps

const callEventHandler = <E extends Event>(
  handler: JSX.EventHandlerUnion<HTMLElement, E> | undefined,
  event: Parameters<JSX.EventHandler<HTMLElement, E>>[0],
) => {
  if (typeof handler === 'function') {
    handler(event)

    return
  }

  handler?.[0](handler[1], event)
}

export const CheckboxBody = <T extends ValidComponent>(props: CheckboxBodyProps<T>) => {
  const [checkboxContext, {handleToggleChecked}] = useContext(CheckboxContext)

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      props.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    )

    if (!event.defaultPrevented) {
      handleToggleChecked()
    }
  }

  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      props.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    )

    const usesNativeSpaceActivation = props.component === 'button' || props.component === 'input'

    if (event.defaultPrevented || event.key !== ' ' || usesNativeSpaceActivation) {
      return
    }

    event.preventDefault()
    handleToggleChecked()
  }

  return (
    <Dynamic
      {...props}
      aria-checked={checkboxContext().checked}
      aria-disabled={checkboxContext().disabled}
      aria-required={checkboxContext().required}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-checked={checkboxContext().checked}
      data-disabled={checkboxContext().disabled}
      disabled={checkboxContext().disabled}
      id={checkboxContext().id}
      role={props.role ?? 'checkbox'}
      tabIndex={props.tabIndex ?? 0}
    />
  )
}
