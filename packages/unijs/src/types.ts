import type {ElementItem} from './create-element'

export const CHILD_SYMBOL = Symbol('child')

export interface Child {
  [CHILD_SYMBOL]?: true
  element: UniElement | null | UniText | UniFragment
  key: any
  onUnmount?: () => void
}

export interface FunctionChildren {
  (cache?: Map<any, Child>): Child | Children | Children[] | Child[] | null
  savedCache?: Map<any, Child>
}
/**
 * null: should not render
 * [HTMLElement, teardown: () => void, key: string | null]: should render
 * [Children]: should call children
 */
export type Children = FunctionChildren | string | number | null

export interface UniExtend {
  cacheChild?: Map<string, Child>
}

export interface UniElement extends Element, UniExtend {
  __never__?: never
}

export interface UniText extends Text, UniExtend {
  __never__?: never
}

export interface UniFragment extends DocumentFragment, UniExtend {
  __never__?: never
}
