import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {type ComponentProps, type JSX, splitProps} from 'solid-js'

export interface HSelectItemSelfProps extends Omit<ComponentProps<'button'>, 'children' | 'role'> {
  children: JSX.Element
  closeOnSelect?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export interface HSelectItemProps extends HSelectItemSelfProps {}

/** Kobalte-backed menu item with optional close-on-select. */
export const HSelectItem = (props: HSelectItemProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'children',
    'closeOnSelect',
    'disabled',
    'onSelect',
  ])

  return (
    <DropdownMenu.Item
      {...restProps}
      disabled={innerProps.disabled}
      closeOnSelect={innerProps.closeOnSelect}
      onSelect={innerProps.onSelect}
    >
      {innerProps.children}
    </DropdownMenu.Item>
  )
}
