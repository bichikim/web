import {Accessor, ParentProps, ValidComponent} from 'solid-js'

export type ElementStyle = string | Record<string, any>

export interface DynamicProps {
  [key: string]: any
  as?: ValidComponent
  class?: string | string[] | Record<string, boolean>
  style?: ElementStyle
}

export interface DynamicParentProps extends ParentProps, DynamicProps {
  __empty__?: never
}

export type Directive<T = any> = (element: HTMLElement, accessor: Accessor<T>) => void
