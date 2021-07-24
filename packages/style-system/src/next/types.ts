import {Properties} from 'csstype'
import {NotUndefined} from '@winter-love/utils'

export type CssProperties = NotUndefined<keyof Properties>

export type PropsWithTheme<Theme extends Record<string, any>> = {
  theme?: Theme
} & {
  [key: string]: any
}
