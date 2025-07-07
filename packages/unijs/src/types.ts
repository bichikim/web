import type {Child} from './create-child'

/**
 * null: should not render
 * [HTMLElement, teardown: () => void, key: string | null]: should render
 * [Children]: should call children
 */
export type Children = (() => Child | Children | null) | string | number | null
