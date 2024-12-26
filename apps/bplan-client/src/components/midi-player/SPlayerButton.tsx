import {JSX, ParentProps, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'

export interface SPlayerButtonProps
  extends ParentProps,
    Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick?: (event: Event) => void
}

export const SPlayerButton = (props: SPlayerButtonProps) => {
  const [innerProps, restProps] = splitProps(props, ['onClick'])

  const handelClick = (event: Event) => {
    innerProps.onClick?.(event)
  }

  return (
    <button
      {...restProps}
      class={cx(
        'px-6px py-2px b-0 rd-6px cursor-pointer overflow-hidden bg-#f4f5f6',
        props.class,
      )}
      onClick={handelClick}
      onTouchEnd={handelClick}
    >
      {props.children}
    </button>
  )
}
