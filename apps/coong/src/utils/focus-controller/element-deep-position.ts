import {type DeepPosition, getDeepPosition, getDeepPositionKey, Position} from './deep-position'
import {getDocument} from '@winter-love/utils'

export const setElementDeepPosition = (element: HTMLElement, deepPosition: DeepPosition) => {
  const key = getDeepPositionKey(deepPosition)

  setElementDeepPositionWithKey(element, key)
}

export const setElementDeepPositionWithKey = (element: HTMLElement, key: string) => {
  element.dataset.deepPosition = key
}

export const getElementDeepPositionKey = (element: HTMLElement): string | null => {
  const key = element.dataset.deepPosition

  if (!key) {
    return null
  }

  return key
}

export const getElementDeepPosition = (element: HTMLElement): DeepPosition | null => {
  const key = getElementDeepPositionKey(element)

  if (!key) {
    return null
  }

  return getDeepPosition(key)
}

export const getElementsFromPoint = (point: Position): Element[] => {
  return getDocument()?.elementsFromPoint(point.x, point.y) ?? []
}

const isHtmlElement = (element: Element): element is HTMLElement => {
  return element instanceof HTMLElement
}

export const getDeepPositionKeyFromPoint = (point: Position): string | null => {
  const elements = getElementsFromPoint(point)

  for (const element of elements) {
    if (isHtmlElement(element)) {
      const key = getElementDeepPositionKey(element)

      if (key) {
        return key
      }
    }
  }

  return null
}

export const getDeepPositionFromPoint = (point: Position): DeepPosition | null => {
  const key = getDeepPositionKeyFromPoint(point)

  if (!key) {
    return null
  }

  return getDeepPosition(key)
}
