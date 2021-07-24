import {Properties} from 'csstype'
import {NotUndefined} from '@winter-love/utils'

export type CssPropertyKeys = NotUndefined<keyof Properties>

export type PropsWithTheme<Theme extends Record<string, any>> = {
  theme?: Theme
} & {
  [key: string]: any
}
