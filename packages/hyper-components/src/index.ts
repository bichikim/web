import {CSS} from '@stitches/core/types'
import {ConfigType, CreateStitches} from '@stitches/core/types/config'
import {CssComponent} from '@stitches/core/types/styled-component'
import {createStyled} from '@winter-love/stitches'
import {theme} from 'src/theme'
import {inject, Plugin} from 'vue-demi'
import {SYSTEM_KEY} from './keys'
import {stitchesUtils} from './stitches-utils'
import {linearGradient, typography} from './variants'

export * from './h-glow'
export * from './h-box'
export * from './quasar-components'

export const useSystem = (): CssComponent => {
  return inject(SYSTEM_KEY, (() => ({})) as any)
}

const runCssClassComponent = (system: CssComponent, css: CSS, variants?: Record<string, any>) => {
  return system({...variants, css}).className
}

export interface VariantAndCss {
  [key: string]: CSS | undefined | null | string | number | boolean | ((...args: any[]) => unknown)

  css?: CSS
}

const addClassScope = (css?: Record<string, any>, withClasses?: string) => {
  if (!withClasses || !css) {
    return css
  }
  const {left, baseCss} = Object.entries(css).reduce((result, [key, value]) => {
    if (key.startsWith('&')) {
      result.left.push([key, value])
      return result
    }
    result.baseCss.push([key, value])
    return result
  }, {baseCss: [] as any[], left: [] as any[]})

  return {
    ...Object.fromEntries(left),
    [`&${withClasses}`]: Object.fromEntries(baseCss),
  }
}

const addClassScopeWithVariant = (csx: VariantAndCss, withClasses?: string) => {
  const {css, ...restCsx} = csx

  return {
    ...restCsx,
    css: addClassScope(css, withClasses),
  }
}

const runCsxClassComponent = (system: CssComponent, csx?: VariantAndCss, withClasses?: string) => {
  const _csx = addClassScopeWithVariant(csx ?? {}, withClasses)
  const result = system(_csx)
  if (!result.props) {
    return {}
  }
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
  return (csx?: VariantAndCss, withClasses?: string) => {
    return runCsxClassComponent(system, csx, withClasses)
  }
}

export type stitchesOptions = Parameters<CreateStitches>[0]

export interface CreateHyperComponentsOptions<Prefix extends string = string,
  Media = Record<string, any>,
  Theme = ConfigType.Theme,
  Utils = Record<string, any>,
  > {
  media?: ConfigType.Media<Media>
  prefix?: ConfigType.Prefix<Prefix>
  theme?: ConfigType.Theme<Theme>
  utils?: ConfigType.Utils<Utils>
  variants?: Record<string, any>
}

/**
 * HyperComponents has stitches, components and preset styles
 * @param options
 */
export const createHyperComponents = <Prefix extends string = string,
  Media = Record<string, any>,
  Theme = ConfigType.Theme,
  Utils = Record<string, any>,
  // todo fix types
  >(options: CreateHyperComponentsOptions<Prefix, Media, Theme, Utils> = {}): any => {
  const {
    theme: _theme = {},
    variants = {},
    utils = {},
    media = {},
    prefix,
  } = options
  const stitchesOptions: Record<string, any> = {
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
  }
  if (prefix) {
    stitchesOptions.prefix = prefix
  }
  const {createDirective, css, ...restStitches} = createStyled(stitchesOptions)

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

export type HyperProps = {
  css?: CSS<{
    media: {
      dp1: string
      dp2: string
      dp3: string
    }
    theme: typeof theme & ConfigType.Theme
    utils: typeof stitchesUtils
  }>
  linearGradient?: string & keyof typeof linearGradient
  typography?: string & keyof typeof typography
}
