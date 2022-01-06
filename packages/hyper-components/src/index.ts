import {Quasar, QuasarPluginOptions} from 'quasar'
import {createStyled} from '@winter-love/stitches'
import {CssComponent} from '@stitches/core/types/styled-component'
import {inject, InjectionKey, Plugin} from 'vue'
import {linearGradient, typography} from './variants'
import {stitchesUtils} from './stitches-utils'
import {ConfigType, CreateStitches} from '@stitches/core/types/config'

export const SYSTEM_KEY: InjectionKey<CssComponent> =
  process.env.NODE_ENV === 'development' ? '__system_key__' as any : Symbol('system-key')

export const useSystem = () : CssComponent => {
  return inject(SYSTEM_KEY, (() => ({})) as any)
}

export type CSSClassComponent = (...args: Record<string, any>[]) => string

export const useClassName = (): CSSClassComponent => {
  const system = inject(SYSTEM_KEY, (() => ({})) as any)
  return (css: any) => {
    return system({css}).className
  }
}

export type stitchesOptions = Parameters<CreateStitches>[0]

export type FunctionComposer = (...args) => any

export interface CreateHyperComponentsOptions {
  quasar?: QuasarPluginOptions
  theme?: ConfigType.Theme
  variants: Record<string, any>
}

export const createHyperComponents = (options: CreateHyperComponentsOptions) => {
  const {theme, variants} = options
  const {createDirective, css, ...restStitches} = createStyled({
    theme,
  })

  const {directive, system} = createDirective({
    utils: stitchesUtils,
    variants: {
      linearGradient,
      typography,
      ...variants,
    },
  })

  const plugin: Plugin = (app) => {
    app.provide(SYSTEM_KEY, system)
    app.use(Quasar)
    app.directive('css', directive)
  }

  return {
    ...restStitches,
    css,
    plugin,
    system,
  }
}
