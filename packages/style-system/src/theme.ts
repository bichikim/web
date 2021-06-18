import {ObjectOrArray, TLengthStyledSystem} from './types'
import {Property, StandardProperties} from 'csstype'
import {AnyObject} from '@winter-love/utils'

export interface DefaultTheme<TLength = TLengthStyledSystem> {
  borderStyles?: ObjectOrArray<Property.Border<AnyObject>>
  borderWidths?: ObjectOrArray<Property.BorderWidth<TLength>>
  borders?: ObjectOrArray<Property.Border<AnyObject>>
  breakpoints?: ObjectOrArray<number | string | symbol>
  buttons?: ObjectOrArray<StandardProperties>
  colorStyles?: ObjectOrArray<StandardProperties>
  colors?: ObjectOrArray<Property.Color>
  fontSizes?: ObjectOrArray<Property.FontSize<number>>
  fontWeights?: ObjectOrArray<Property.FontWeight>
  fonts?: ObjectOrArray<Property.FontFamily>
  letterSpacings?: ObjectOrArray<Property.LetterSpacing<TLength>>
  lineHeights?: ObjectOrArray<Property.LineHeight<TLength>>
  mediaQueries?: { [size: string]: string }
  radii?: ObjectOrArray<Property.BorderRadius<TLength>>
  shadows?: ObjectOrArray<Property.BoxShadow>
  sizes?: ObjectOrArray<Property.Height<AnyObject> | Property.Width<AnyObject>>
  space?: ObjectOrArray<Property.Margin<number | string>>
  textStyles?: ObjectOrArray<StandardProperties>
  zIndices?: ObjectOrArray<Property.ZIndex>
}

export type RequiredTheme = Required<DefaultTheme>

export type ThemeValue<ThemeType, K extends keyof ThemeType, TValue = any> =
  ThemeType[K] extends TValue[] ? number :
    ThemeType[K] extends Record<infer E, TValue> ? E :
      ThemeType[K] extends ObjectOrArray<infer F> ? F : never


