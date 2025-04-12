import {Accessor} from 'solid-js'

export type Directive<T = any> = (element: HTMLElement, accessor: Accessor<T>) => void
export type DirectiveNoneValue<T> = (element: HTMLElement) => T
