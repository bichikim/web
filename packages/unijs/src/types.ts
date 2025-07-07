/**
 * null: should not render
 * [HTMLElement, teardown: () => void, key: string | null]: should render
 * [Children]: should call children
 */
export type Children =
  | (() => [HTMLElement, teardown: () => void, key: string | null] | Children | null)
  | string
  | number
  | null
