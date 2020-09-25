/* eslint-disable no-use-before-define */
import {CssFunctionReturnType, CSSProperties} from '@styled-system/css'
import * as CSS from 'csstype'
import {styleFn, Theme} from 'styled-system'

export type PropsWithTheme<P, T extends Theme = Theme> = P & {
  theme?: Theme
}

export type SystemFunc<P, T extends Theme = Theme> =
  (props: PropsWithTheme<P, T>) => CSSObject | CssFunctionReturnType

export type PossibleSystemItem<P, T> = CSSObject | styleFn

export type System<P, T = Theme> =
  ReadonlyArray<PossibleSystemItem<P, T> | ReadonlyArray<PossibleSystemItem<P, T>>>

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
