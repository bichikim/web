import {cx} from 'class-variance-authority'
import {type JSX, splitProps} from 'solid-js'
import {HSelectItem, type HSelectItemProps} from './HSelectItem'

const defaultItemClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0 bg-transparent px-3 py-2.5 text-left',
  'text-3.5 font-600 text-#101114 outline-none ui-highlighted:bg-black/5',
  'ui-disabled:cursor-not-allowed ui-disabled:opacity-60',
)

export interface SSelectItemProps extends Omit<HSelectItemProps, 'children'> {
  class?: string
  children: JSX.Element
}

/** Styled menu item. Use inside `HSelectRoot` / `SSelectList`. */
export const SSelectItem = (props: SSelectItemProps) => {
  const [local, itemProps] = splitProps(props, ['class'])

  return <HSelectItem {...itemProps} class={cx(defaultItemClass, local.class)} />
}
