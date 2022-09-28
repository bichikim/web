import {Prop, PropType} from 'vue'
import {PureObject} from '@winter-love/utils'

export type DefaultFactory<T> = (props: PureObject) => T | null | undefined
export interface PropOptions<T = any, D = T> {
  default?: D | DefaultFactory<D> | null | undefined | object
  required?: boolean
  type?: PropType<T> | true | null

  validator?(value: unknown): boolean
}

export type PropsArray = string[]
export type PropsObject<Key extends string = string, T = any, D = T> = Record<
  Key,
  Prop<T, D> | null
>

export type Props<T = any, D = T> = PropsArray | PropsObject<string, T, D>

export type RequiredKeys<T> = {
  [K in keyof T]: T[K] extends {
    required: true
  }
    ? T[K] extends {
        default: undefined | (() => undefined)
      }
      ? never
      : K
    : never
}[keyof T]

export type InferPropType<T> = [T] extends [null]
  ? any
  : [T] extends [
      {
        type: null | true
      },
    ]
  ? any
  : [T] extends [
      | ObjectConstructor
      | {
          type: ObjectConstructor
        },
    ]
  ? Record<string, any>
  : [T] extends [
      | BooleanConstructor
      | {
          type: BooleanConstructor
        },
    ]
  ? boolean
  : [T] extends [
      | DateConstructor
      | {
          type: DateConstructor
        },
    ]
  ? Date
  : [T] extends [Prop<infer V, infer D>]
  ? unknown extends V
    ? D
    : V
  : T

export type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>

// eslint-disable-next-line @typescript-eslint/ban-types
export type ExtractPropTypesForUsing<O> = O extends object
  ? {
      [K in keyof O]?: unknown
    } & {
      [K in RequiredKeys<O>]: InferPropType<O[K]>
    } & {
      [K in OptionalKeys<O>]?: InferPropType<O[K]>
    }
  : {
      [K in string]: any
    }
