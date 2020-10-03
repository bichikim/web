/* eslint-disable no-use-before-define */
import {CssFunctionReturnType, CSSProperties} from '@styled-system/css'
import * as CSS from 'csstype'
import {styleFn, Theme} from 'styled-system'

export type PropsWithTheme<P, T extends Theme = Theme> = P & {
  theme?: T
}

export type SystemFunc<P, T extends Theme = Theme> =
  (props: PropsWithTheme<P, T>) => CSSObject | CssFunctionReturnType

export type PossibleSystemItem = CSSObject | styleFn

export type System =
  ReadonlyArray<PossibleSystemItem | ReadonlyArray<PossibleSystemItem>>

export type FunctionCSSObject = (props: any) => any
export type CSSInterpolation =
  undefined
  | number
  | string
  | CSSObject
  | CSSObject[]
  | FunctionCSSObject
  | FunctionCSSObject[]
export type CSSPseudosForCSSObject = { [K in CSS.Pseudos]?: CSSObject };

export interface CSSOthersObjectForCSSObject {
  [propertiesName: string]: CSSInterpolation;
}

export type CSSPropertiesWithMultiValues = {
  [K in keyof CSSProperties]: CSSProperties[K];
};

export interface CSSObject extends CSSPropertiesWithMultiValues, CSSPseudosForCSSObject, CSSOthersObjectForCSSObject {
}
