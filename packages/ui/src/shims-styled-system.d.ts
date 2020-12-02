import {PropsWithTheme} from '@winter-love/emotion'
import {AnyObject} from '@innovirus/utils'
import {CssFunctionReturnType, CSSObject as _CSSObject} from '@styled-system/css'
import {Theme} from 'styled-system'
import {ConfigStyle} from 'styled-system/index.d.ts'

declare module 'styled-system' {

  export * from 'styled-system/index.d.ts'
  export interface SystemFunc<P extends AnyObject, T extends Theme = Theme> {
    (props: PropsWithTheme<P, T>, ...args: any[]): _CSSObject | CssFunctionReturnType;

    cache?: Record<string, any>
    config?: Record<string, any>
    propNames?: string[]
  }
  export type Config2<S extends string> = Record<S, ConfigStyle | boolean>

  export function system<S extends Record<string, any>>(styleDefinitions: Config2<keyof S>): SystemFunc<S>
}
