import {cx} from 'class-variance-authority'
import {splitProps} from 'solid-js'
import {HSelectItem, type HSelectItemProps} from './HSelectItem'

const defaultItemClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0 bg-transparent px-3 py-2.5 text-left',
  'text-3.5 font-600 text-#101114 hover:bg-black/5',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'data-disabled:cursor-not-allowed data-disabled:opacity-60',
  'data-focused:bg-black/5',
)

export interface SSelectItemProps extends HSelectItemProps {
  class?: string
}

/** Styled menu item. Use inside `HSelectRoot` / `SSelectList`. */
export const SSelectItem = (props: SSelectItemProps) => {
  const [local, itemProps] = splitProps(props, ['class'])

  return <HSelectItem {...itemProps} class={cx(defaultItemClass, local.class)} />
}
