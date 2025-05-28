import {getElement} from 'src/get-element'

const UPDATE_ELEMENT_SYMBOL = Symbol('updateElement')

export const updateElementClasses = (_element?: HTMLElement | string | null, ...classes: string[]) => {
  const element = getElement(_element)

  if (!element) {
    return
  }

  const prevClasses = element[UPDATE_ELEMENT_SYMBOL] ?? []

  element.classList.remove(...prevClasses)
  element[UPDATE_ELEMENT_SYMBOL] = [...classes]
  element.classList.add(...classes)
}
