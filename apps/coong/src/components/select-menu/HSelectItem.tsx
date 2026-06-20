import {type ComponentProps, type JSX, Show, createMemo, splitProps} from 'solid-js'
import {type UseSelectMenuItemOptions, useSelectMenuItem} from './select-menu-item'

export interface HSelectItemPassArg {
  'data-disabled': string | undefined
  'data-focused': string | undefined
  disabled: boolean
  onClick: JSX.EventHandler<HTMLElement, MouseEvent>
  role: 'menuitem'
  tabIndex: number
}

export interface HSelectItemSelfProps extends Omit<ComponentProps<'button'>, 'children' | 'role'> {
  children: JSX.Element
  closeOnSelect?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export interface HSelectItemPassProps extends UseSelectMenuItemOptions {
  children: (arg: HSelectItemPassArg) => JSX.Element
}

export type HSelectItemProps = HSelectItemSelfProps | HSelectItemPassProps

/** Headless menu item with roving tabindex and optional close-on-select. */
export const HSelectItem = (props: HSelectItemProps) => {
  const [innerProps, restProps] = splitProps(props as HSelectItemSelfProps, [
    'children',
    'closeOnSelect',
    'disabled',
    'onSelect',
  ])
  const {itemProps, setElement} = useSelectMenuItem({
    closeOnSelect: innerProps.closeOnSelect,
    disabled: innerProps.disabled,
    onSelect: innerProps.onSelect,
  })

  const itemArg = createMemo<HSelectItemPassArg>(() => ({
    'data-disabled': itemProps()['data-disabled'] as string | undefined,
    'data-focused': itemProps()['data-focused'] as string | undefined,
    disabled: innerProps.disabled ?? false,
    onClick: itemProps().onClick as JSX.EventHandler<HTMLElement, MouseEvent>,
    role: 'menuitem',
    tabIndex: itemProps().tabIndex as number,
  }))

  const children = createMemo(() => {
    if (typeof props.children === 'function') {
      return props.children(itemArg())
    }

    return props.children
  })

  return (
    <Show
      when={typeof props.children === 'function'}
      fallback={
        <button
          {...restProps}
          ref={setElement}
          type={restProps.type ?? 'button'}
          role="menuitem"
          disabled={innerProps.disabled}
          tabIndex={itemArg().tabIndex}
          data-disabled={itemArg()['data-disabled']}
          data-focused={itemArg()['data-focused']}
          onClick={itemArg().onClick}
        >
          {children()}
        </button>
      }
    >
      {children()}
    </Show>
  )
}
