export const CHILD_SYMBOL = Symbol('child')

export interface Child {
  [CHILD_SYMBOL]?: true
  element: Element
  key: string | null
  teardown: () => void
}

export const isChild = (value: any): value is Child => {
  return value && value[CHILD_SYMBOL]
}

export const createChild = (element: Element, key: string | null, teardown: () => void): Child => {
  return {
    [CHILD_SYMBOL]: true,
    element,
    key,
    teardown,
  }
}
