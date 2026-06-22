import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {type JSX, splitProps} from 'solid-js'

export interface HSelectSeparatorProps extends JSX.HTMLAttributes<HTMLDivElement> {}

/** Kobalte-backed separator between menu items. */
export const HSelectSeparator = (props: HSelectSeparatorProps) => {
  const [local, separatorProps] = splitProps(props, ['class', 'role'])

  return (
    <DropdownMenu.Separator
      {...separatorProps}
      role={local.role ?? 'separator'}
      class={local.class}
    />
  )
}
