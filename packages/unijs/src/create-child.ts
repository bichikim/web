import {Child, CHILD_SYMBOL, UniElement, UniFragment} from './types'

export const isChild = (value: any): value is Child => {
  return value && value[CHILD_SYMBOL]
}

export const createChild = (element: UniElement | null | UniFragment, key: any, onUnmount?: () => void): Child => {
  return {
    [CHILD_SYMBOL]: true,
    element,
    key,
    onUnmount,
  }
}
