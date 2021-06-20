import {CSSObject} from '@emotion/css'
import {AnyObject, PureObject} from '@winter-love/utils'
import {ConfigStyle} from './system'

export type ObjectOrArray<T, K extends keyof any = keyof any> = T[] | Record<K, T | Record<K, T> | T[]>
export type TLengthStyledSystem = string | 0 | number

export interface StyleParse {
  cache?: AnyObject
  config?: AnyObject
  propNames?: string[]

  (...args: any[]): any
}

export type ResponsiveValue<T,
  > = T | null | Array<T | null> | { [key in string | number]?: T };

export interface StyleFunction<Key extends string = string,
  Scale extends PureObject = PureObject,
  Props extends PureObject = PureObject> {
  defaults?: Scale
  scale?: string

  (value: Key, scale: Scale | undefined, props: Props, index?: number | string): any
}

export interface Config<Theme extends PureObject = PureObject> {
  [customStyleName: string]: ConfigStyle<Theme>
    | boolean | ((value: any, scale: any, props: any, index: number) => CSSObject)
}
