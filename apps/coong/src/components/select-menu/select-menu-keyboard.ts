import {
  focusMenuItemByOffset,
  getEnabledMenuItemElements,
  isMenuNavigationKey,
} from './select-menu-focus'
import type {SelectMenuItemRegistration} from './use-select-menu'

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
    const {key} = event

    if (!isMenuNavigationKey(key)) {
      return
    }

    const enabledItems = getEnabledMenuItemElements(options.getItems())

    if (enabledItems.length === 0) {
      return
    }

    event.preventDefault()

    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const offset = key === 'ArrowDown' ? 1 : -1
        const nextElement = focusMenuItemByOffset(enabledItems, options.getFocusedElement(), offset)
        options.setFocusedElement(nextElement)
        return
      }
      case 'End': {
        const lastItem = enabledItems[enabledItems.length - 1]
        lastItem?.focus()
        options.setFocusedElement(lastItem)
        return
      }
      case 'Home': {
        const [firstItem] = enabledItems
        firstItem?.focus()
        options.setFocusedElement(firstItem)
        return
      }
    }

    key satisfies never
  }

  return {
    focusFirstItem,
    handleContentKeyDown,
  }
}
