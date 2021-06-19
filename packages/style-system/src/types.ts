import {CSSObject} from '@emotion/css'
import {AnyObject, PureObject} from '@winter-love/utils'
import {Properties} from 'csstype'

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

export interface ConfigStyle<Theme extends AnyObject, Scale extends string | number | symbol = keyof Theme> {
  /** A fallback scale object for when there isn't one defined in the `theme` object. */
  defaultScale?: Scale
  /**
   * An array of multiple properties (e.g. `['marginLeft', 'marginRight']`) to which this style's value will be
   * assigned (overrides `property` when present).
   */
  properties?: Array<keyof Properties>
  /** The CSS property to use in the returned style object (overridden by `properties` if present). */
  property?: keyof Properties
  /** A string referencing a key in the `theme` object. */
  scale?: Scale
  /** A function to transform the raw value based on the scale. */
  transform?: (value: keyof Theme[Scale], scale?: Theme[Scale]) => any
}

export interface Config<Theme extends PureObject = PureObject> {
  [customStyleName: string]: ConfigStyle<Theme>
    | boolean | ((value: any, scale: any, props: any, index: number) => CSSObject)
}
