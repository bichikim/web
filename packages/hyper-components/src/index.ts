import {createStyled, CSS} from '@winter-love/stitches'
import {CssComponent} from '@stitches/core/types/styled-component'
import {inject, InjectionKey, Plugin} from 'vue'
import {linearGradient, typography} from './variants'
import {stitchesUtils} from './stitches-utils'
import {ConfigType, CreateStitches} from '@stitches/core/types/config'
import {theme} from 'src/theme'

export * from './h-glow'
export * from './h-page'

export const SYSTEM_KEY: InjectionKey<CssComponent> =
  process.env.NODE_ENV === 'development' ? '__system_key__' as any : Symbol('system-key')

export const useSystem = () : CssComponent => {
  return inject(SYSTEM_KEY, (() => ({})) as any)
}

const runCssClassComponent = (system: CssComponent, css: CSS, variants?: Record<string, any>) => {
  return system({...variants, css}).className
}

export interface VariantAndCss {
  [key: string]: CSS | undefined | null | string | number | boolean | ((...args: any[]) => unknown)
  css?: CSS
}

const runCsxClassComponent = (system: CssComponent, csx?: VariantAndCss) => {
  const result = system(csx)
  const {className, ...rest} = result.props as any
  return {
    ...rest,
    class: className,
  }
}

export type CSSClassComponent = (css: CSS, variants?: Record<string, any>) => string

export const useClassName = (): CSSClassComponent => {
  const system = inject(SYSTEM_KEY, (() => ({})) as any)
  return (css: CSS, variants?: Record<string, any>) => {
    return runCssClassComponent(system, css, variants)
  }
}

export const useCsx = () => {
  const system = inject(SYSTEM_KEY, (() => ({})) as any)
  return (csx?: VariantAndCss) => {
    return runCsxClassComponent(system, csx)
  }
}

export type stitchesOptions = Parameters<CreateStitches>[0]

export type FunctionComposer = (...args) => any

export interface CreateHyperComponentsOptions<
  Media = Record<string, any>,
  Theme = ConfigType.Theme,
  Utils = Record<string, any>,
  > {
  media?: Media
  theme?: Theme
  utils?: Utils
  variants?: Record<string, any>
}

/**
 * HyperComponents has stitches, components and preset styles
 * @param options
 */
export const createHyperComponents = <
  Media = Record<string, any>,
  Theme = ConfigType.Theme,
  Utils = Record<string, any>,
  >(options: CreateHyperComponentsOptions<Media, Theme, Utils> = {}) => {
  const {
    theme: _theme = {},
    variants = {},
    utils = {},
    media = {},
  } = options
  const {createDirective, css, ...restStitches} = createStyled({
    media: {
      bp1: '(min-width: 640px)',
      bp2: '(min-width: 768px)',
      bp3: '(min-width: 1024px)',
      ...media,
    },
    theme: {
      ...theme,
      ..._theme,
    },
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

  const className = (css: CSS, variants?: Record<string, any>) => {
    return runCssClassComponent(system, css, variants)
  }

  const csx = (csx?: VariantAndCss) => {
    return runCsxClassComponent(system, csx)
  }

  const plugin: Plugin = (app) => {
    app.provide(SYSTEM_KEY, system)
    app.directive('css', directive)
  }

  return {
    ...restStitches,
    className,
    css,
    csx,
    plugin,
    system,
  }
}
