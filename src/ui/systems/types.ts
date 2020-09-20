import {CssFunctionReturnType, CSSObject} from '@styled-system/css'
import {Theme} from 'styled-system'

export type PropsWithTheme<P, T extends Theme = Theme> = P & {
  theme?: Theme
}

export type SystemFunc<P, T extends Theme = Theme> =
  (props: PropsWithTheme<P, T>) => CSSObject | CssFunctionReturnType
