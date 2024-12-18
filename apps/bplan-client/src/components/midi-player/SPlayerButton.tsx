import {JSX, ParentProps} from 'solid-js'
import {cx} from 'class-variance-authority'

export interface SPlayerButtonProps
  extends ParentProps,
    JSX.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SPlayerButton = (props: SPlayerButtonProps) => {
  return (
    <button
      {...props}
      class={cx(
        'px-6px py-2px b-0 rd-6px cursor-pointer overflow-hidden bg-#f4f5f6',
        props.class,
      )}
    >
      {props.children}
    </button>
  )
}
