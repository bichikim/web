import {Accessor} from 'solid-js'

export type MayBeAccessor<T> = Accessor<T> | T

export type AccessorsValue<T> = T extends any[]
  ? {[K in keyof T]: T[K] extends Accessor<infer L> ? L : T[K]}
  : T extends Accessor<infer L>
    ? L
    : T

export type NotArray =
  | number
  | string
  | boolean
  | symbol
  | null
  | undefined
  | ((...args: any) => any)
  | Record<string, any>

export type MayBeAccessors = [...any] | [any] | NotArray
