import {EmitsOptions, ObjectEmitsOptions, Prop} from 'vue'

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

export type EmitsToProps<T extends EmitsOptions> = T extends string[]
  ? {
      [K in string & `on${Capitalize<T[number]>}`]?: (...args: any[]) => any
    }
  : T extends ObjectEmitsOptions
    ? {
        [K in string & `on${Capitalize<string & keyof T>}`]?: K extends `on${infer C}`
          ? T[Uncapitalize<C>] extends null
            ? (...args: any[]) => any
            : (
                ...args: T[Uncapitalize<C>] extends (...args: infer P) => any ? P : never
              ) => any
          : never
      } // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    : {}
