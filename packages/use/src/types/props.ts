import {Prop, PropType} from 'vue-demi'
import {AnyObject, PureObject} from '@winter-love/utils'

export type DefaultFactory<T> = (props: PureObject) => T | null | undefined
export interface PropOptions<T = any, D = T> {
  default?: D | DefaultFactory<D> | null | undefined | AnyObject
  required?: boolean
  type?: PropType<T> | true | null
  validator?(value: unknown): boolean
}

export type PropsArray = string[]
export type PropsObject<Key extends string = string, T = any, D = T> = Record<Key, Prop<T, D> | null>

export type Props<T = any, D = T> = PropsArray | PropsObject<string, T, D>
