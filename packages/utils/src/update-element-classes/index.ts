import {getNativeElement} from 'src/get-native-element'

const UPDATE_ELEMENT_SYMBOL = Symbol('updateElement')

export const updateElementClasses = (_element: HTMLElement | string, ...classes: string[]) => {
  const element = getNativeElement(_element)
  if (!element) {
    return
  }
  const prevClasses = element[UPDATE_ELEMENT_SYMBOL] ?? []
  element.classList.remove(...prevClasses)
  element[UPDATE_ELEMENT_SYMBOL] = [...classes]
  element.classList.add(...classes)
}
