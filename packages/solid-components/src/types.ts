import {Accessor} from 'solid-js'

export type Directive<T = any> = (element: HTMLElement, accessor: Accessor<T>) => void
