export const getEnabledMenuItemElements = (
  items: readonly {disabled: () => boolean; element: HTMLElement}[],
): HTMLElement[] => {
  return items.filter((item) => !item.disabled()).map((item) => item.element)
}

export const focusMenuItemByOffset = (
  items: readonly HTMLElement[],
  currentElement: HTMLElement | undefined,
  offset: number,
): HTMLElement | undefined => {
  if (items.length === 0) {
    return undefined
  }

  const currentIndex = currentElement === undefined ? -1 : items.indexOf(currentElement)
  let nextIndex = currentIndex + offset

  if (nextIndex < 0) {
    nextIndex = items.length - 1
  }

  if (nextIndex >= items.length) {
    nextIndex = 0
  }

  const nextElement = items[nextIndex]
  nextElement?.focus()

  return nextElement
}

export type MenuNavigationKey = 'ArrowDown' | 'ArrowUp' | 'End' | 'Home'

export const isMenuNavigationKey = (key: string): key is MenuNavigationKey => {
  return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End'
}
