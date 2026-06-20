import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {useSelectMenuContext} from './context'

export interface SelectMenuItemRegistration {
  disabled: Accessor<boolean>
  element: HTMLElement
}

export interface UseSelectMenuItemOptions {
  closeOnSelect?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export const useSelectMenuItem = (options: UseSelectMenuItemOptions = {}) => {
  const {controller} = useSelectMenuContext()
  const [element, setElement] = createSignal<HTMLElement | undefined>()
  const disabled = () => options.disabled ?? false
  const closeOnSelect = () => options.closeOnSelect ?? true

  onMount(() => {
    const itemElement = element()

    if (!itemElement) {
      return
    }

    const registration: SelectMenuItemRegistration = {
      disabled,
      element: itemElement,
    }
    const unregister = controller.registerItem(registration)

    onCleanup(unregister)
  })

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (disabled()) {
      event.preventDefault()

      return
    }

    options.onSelect?.()

    if (closeOnSelect()) {
      controller.onHide()
    }
  }

  const itemProps = (): Record<string, unknown> => {
    const itemElement = element()

    return {
      'data-disabled': disabled() ? '' : undefined,
      'data-focused': controller.isItemFocused(itemElement) ? '' : undefined,
      onClick: handleClick,
      role: 'menuitem',
      tabIndex: controller.isItemFocused(itemElement) ? 0 : -1,
    }
  }

  return {
    itemProps,
    setElement,
  }
}

// Solid JSX namespace for event handler typing without importing solid-js in .ts
declare namespace JSX {
  interface Element {
    //
  }

  interface ElementClass {
    //
  }

  interface ElementAttributes {
    //
  }

  interface IntrinsicElements {
    //
  }

  type EventHandler<T, E extends Event> = (event: E & {currentTarget: T}) => void
}
