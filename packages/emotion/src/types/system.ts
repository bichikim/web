import {AnyObject} from '@innovirus/utils'
import {CssFunctionReturnType, CSSProperties, CSSObject as _CSSObject} from '@styled-system/css'
import {Theme, styleFn} from 'styled-system'

export type PropsWithTheme<P, T extends Theme = Theme> = P & {
  theme?: T
}

export interface SystemFunc<P extends AnyObject, T extends Theme = Theme> {
  (props: PropsWithTheme<P, T>, ...args: any[]): _CSSObject | CssFunctionReturnType

  cache?: Record<string, any>
  config?: Record<string, any>
  propNames?: string[]
}

export type PureSystemFunc<P extends AnyObject, T extends Theme = Theme> = (props: PropsWithTheme<P, T>, ...args: any[]) => _CSSObject | CssFunctionReturnType;

export type CSSObject<P, T extends Theme = Theme> = _CSSObject | SystemFunc<P, T> | styleFn | PureSystemFunc<P, T>

export type StyledSystems<P, T extends Theme = Theme> = CSSObject<P, T>[]

export type System<P = AnyObject, T extends Theme = Theme> =
  ReadonlyArray<CSSObject<P, T> | ReadonlyArray<CSSObject<P, T>>>

export type FunctionCSSObject = (props: any) => any

export type CSSPropertiesWithMultiValues = {
  [K in keyof CSSProperties]: CSSProperties[K];
};
