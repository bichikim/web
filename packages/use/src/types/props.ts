import {PropType} from 'vue-demi'
import {AnyObject, PureObject} from '@winter-love/utils'

export type DefaultFactory<T> = (props: PureObject) => T | null | undefined
export interface PropOptions<T = any, D = T> {
  type?: PropType<T> | true | null;
  required?: boolean;
  default?: D | DefaultFactory<D> | null | undefined | AnyObject;
  validator?(value: unknown): boolean;
}

export type PropsArray = string[]
export type PropsObject<T = any, D = T> = Record<string, PropOptions<T, D> | null>

export type Props<T = any, D = T> = PropsArray | PropsObject<T, D>
