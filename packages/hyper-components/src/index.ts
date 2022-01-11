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
  media?: Record<string, any>
  theme?: ConfigType.Theme
  utils?: Record<string, any>
  variants?: Record<string, any>
}

/**
 * HyperComponents has stitches, components and preset styles
 * @param options
 */
export const createHyperComponents = (options: CreateHyperComponentsOptions = {}) => {
  const {theme = {}, variants = {}, utils = {}, media = {}} = options
  const {createDirective, css, ...restStitches} = createStyled({
    media: {
      bp1: '(min-width: 640px)',
      bp2: '(min-width: 768px)',
      bp3: '(min-width: 1024px)',
      ...media,
    },
    theme,
    utils: {...stitchesUtils, ...utils},
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
    app.directive('css', directive)
  }

  return {
    ...restStitches,
    css,
    plugin,
    system,
  }
}
