import {CssFunctionReturnType, CSSObject} from '@styled-system/css'
import {styleFn, Theme} from 'styled-system'

export type EmptyObject = {
  // empty
}

export type PropsWithTheme<P, T extends Theme = Theme> = P & {
  theme?: Theme
}

export type SystemFunc<P, T extends Theme = Theme> =
  (props: PropsWithTheme<P, T>) => CSSObject | CssFunctionReturnType

export type PossibleSystemItem<P, T> = CSSObject | styleFn

export type System<P, T = Theme> = ReadonlyArray<PossibleSystemItem<P, T> | ReadonlyArray<PossibleSystemItem<P, T>>>

export interface ASProps {
  as?: keyof JSX.IntrinsicElements
}
