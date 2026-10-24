import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {type ComponentProps, type JSX, splitProps} from 'solid-js'

export interface HSelectTriggerSelfProps extends Omit<ComponentProps<'button'>, 'children'> {
  children: JSX.Element
}

export interface HSelectTriggerProps extends HSelectTriggerSelfProps {}

/** Kobalte-backed trigger wired to `HSelectRoot`. */
export const HSelectTrigger = (props: HSelectTriggerProps) => {
  const [innerProps, restProps] = splitProps(props, ['children'])

  return (
    <DropdownMenu.Trigger {...restProps} type={restProps.type ?? 'button'} aria-haspopup="menu">
      {innerProps.children}
    </DropdownMenu.Trigger>
  )
}
