import {cx} from 'class-variance-authority'
import {type JSX, splitProps} from 'solid-js'

export interface SSelectButtonProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'ref'
> {
  children: JSX.Element
}

const triggerClass = cx(
  ':uno: flex h-9 cursor-pointer items-center gap-1 rounded-full border-0',
  'bg-transparent px-3 text-3.5 font-600 text-#101114',
)

/** Trigger button for a popover menu (pair with `SSelectList`). */
export function SSelectButton(props: SSelectButtonProps) {
  const [local, buttonProps] = splitProps(props, ['children', 'class', 'type'])

  return (
    <button {...buttonProps} type={local.type ?? 'button'} class={cx(triggerClass, local.class)}>
      {local.children}
    </button>
  )
}
