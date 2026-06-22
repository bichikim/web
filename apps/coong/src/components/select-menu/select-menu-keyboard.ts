import {
  focusMenuItemByOffset,
  getEnabledMenuItemElements,
  isMenuNavigationKey,
} from './select-menu-focus'
import type {SelectMenuItemRegistration} from './select-menu-item'

export const createSelectMenuKeyboard = (options: {
  getFocusedElement: () => HTMLElement | undefined
  getItems: () => SelectMenuItemRegistration[]
  setFocusedElement: (element: HTMLElement | undefined) => void
}) => {
  const focusFirstItem = () => {
    const [firstItem] = getEnabledMenuItemElements(options.getItems())

    if (!firstItem) {
      return
    }

    firstItem.focus()
    options.setFocusedElement(firstItem)
  }

  const handleContentKeyDown = (event: KeyboardEvent) => {
    if (!isMenuNavigationKey(event.key)) {
      return
    }

    const enabledItems = getEnabledMenuItemElements(options.getItems())

    if (enabledItems.length === 0) {
      return
    }

    event.preventDefault()

    if (event.key === 'Home') {
      const [firstItem] = enabledItems
      firstItem?.focus()
      options.setFocusedElement(firstItem)

      return
    }

    if (event.key === 'End') {
      const lastItem = enabledItems[enabledItems.length - 1]
      lastItem?.focus()
      options.setFocusedElement(lastItem)

      return
    }

    const offset = event.key === 'ArrowDown' ? 1 : -1
    const nextElement = focusMenuItemByOffset(enabledItems, options.getFocusedElement(), offset)
    options.setFocusedElement(nextElement)
  }

  return {
    focusFirstItem,
    handleContentKeyDown,
  }
}
