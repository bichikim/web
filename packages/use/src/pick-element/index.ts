import {PossibleElement} from '../types'
import {isElement} from '../is-element'
import {isComponentInstance} from '../is-component-instance'

export const pickElement = (value: PossibleElement): Element | undefined | null => {
  if (isComponentInstance(value)) {
    return value?.$el
  }
  if (isElement(value)) {
    return value
  }
}
