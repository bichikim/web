import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {type Accessor, type JSX, splitProps} from 'solid-js'
import type {SelectMenuController} from './use-select-menu'

export interface HSelectContentProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'ref' | 'style'
> {
  /** When used outside `HSelectRoot`, pass a controller from `useSelectMenu`. */
  controller?: SelectMenuController
  /** Static position override (e.g. Storybook); defaults to controller positioning. */
  left?: Accessor<number>
  top?: Accessor<number>
  children: JSX.Element
  popover?: 'auto' | 'manual'
}

/** Kobalte-backed menu content. */
export const HSelectContent = (props: HSelectContentProps) => {
  const [local, contentProps] = splitProps(props, [
    'children',
    'class',
    'controller',
    'id',
    'left',
    'onKeyDown',
    'onToggle',
    'popover',
    'role',
    'top',
  ])

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        {...contentProps}
        id={local.id}
        role={local.role ?? 'menu'}
        class={local.class}
        style={{
          left: local.left ? `${local.left()}px` : undefined,
          top: local.top ? `${local.top()}px` : undefined,
        }}
        onKeyDown={local.onKeyDown}
      >
        {local.children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}
