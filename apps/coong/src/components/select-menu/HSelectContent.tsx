import {type Accessor, type JSX, splitProps, useContext} from 'solid-js'
import {SelectMenuContext} from './context'
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

/** Headless popover panel (Popover API) positioned from the trigger. */
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
  const context = useContext(SelectMenuContext)

  const menuController = () => {
    if (local.controller) {
      return local.controller
    }

    if (!context) {
      throw new Error('HSelectContent requires HSelectRoot or a controller prop')
    }

    return context.controller
  }
  const popoverMode = () => local.popover ?? 'auto'

  const handleRef = (element: HTMLDivElement) => {
    menuController().registerPanel(element)
  }

  const handleToggle: JSX.EventHandler<HTMLDivElement, ToggleEvent> = (event) => {
    menuController().onPanelToggle()

    if (typeof local.onToggle === 'function') {
      local.onToggle(event)
    }
  }

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    menuController().handleContentKeyDown(event)

    if (typeof local.onKeyDown === 'function') {
      local.onKeyDown(event)
    }
  }

  return (
    <div
      {...contentProps}
      ref={handleRef}
      id={local.id ?? menuController().listId}
      popover={popoverMode()}
      role={local.role ?? 'menu'}
      class={local.class}
      style={{
        left: `${local.left?.() ?? menuController().left()}px`,
        top: `${local.top?.() ?? menuController().top()}px`,
      }}
      onKeyDown={handleKeyDown}
      onToggle={handleToggle}
    >
      {local.children}
    </div>
  )
}
