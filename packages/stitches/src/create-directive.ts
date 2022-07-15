import {ConfigType, DefaultThemeMap} from '@stitches/core/types/config'
import * as CSSUtil from '@stitches/core/types/css-util'
import * as Util from '@stitches/core/types/util'
import {EmptyObject} from '@winter-love/utils'
import {DirectiveBinding, ObjectDirective} from 'vue-demi'
import {RemoveIndex} from '@stitches/core/types/stitches'
import {CssComponent} from '@stitches/core/types/styled-component'
import {createStitches} from '@stitches/core'

export interface StitchesInfo {
  previousClassNames?: string[]
}

export type DirectiveBindingValue =
  | Record<string, any>
  | [Record<string, any>]
  | [Record<string, any>, Record<string, any>]

export interface CreateDirectiveOptions {
  systems?: Record<string, (props: any) => unknown>
  theme?: Record<string, any>
}

export type StitchesElement = Element & {
  __stitches__?: StitchesInfo
}

export interface GetCssListPayload {
  breakpoint?: string
  css: Record<string, any>
  system: CssComponent
  variants?: Record<string, any>
}

export const applyTarget = (css: Record<string, any>, breakpoint?: string) => {
  return breakpoint
    ? {
        [`@${breakpoint}`]: css,
      }
    : css
}

export const getCssString = (payload: GetCssListPayload): string => {
  const {css, variants, system, breakpoint} = payload

  return system({...variants, css: applyTarget(css, breakpoint)}).className
}

export const getCssList = (payload: GetCssListPayload): string[] => {
  return getCssString(payload).split(' ')
}

export const getClassName = (
  system: CssComponent,
  binding: DirectiveBinding<DirectiveBindingValue>,
) => {
  const {value, arg} = binding

  if (typeof value !== 'object') {
    return
  }

  if (Array.isArray(value)) {
    const [css, variants] = value
    return getCssString({breakpoint: arg, css, system, variants})
  }

  return getCssString({breakpoint: arg, css: value, system})
}

export const getSaveInfoKey = (
  binding: DirectiveBinding<DirectiveBindingValue>,
  name: string = '__stitches__',
) => {
  const {arg: namespace = ''} = binding
  return `${name}${namespace}`
}

const updateClassName = (
  system: CssComponent,
  el: StitchesElement,
  binding: DirectiveBinding<DirectiveBindingValue>,
) => {
  const infoKey = getSaveInfoKey(binding)
  const {previousClassNames} = el[infoKey] ?? {}
  if (previousClassNames) {
    el.classList.remove(...previousClassNames)
  }

  const className = getClassName(system, binding)
  const classNames = className ? className.split(' ') : className

  el[infoKey] = {
    previousClassNames: classNames,
  }

  if (classNames) {
    el.classList.add(...classNames)
  }
}

export const createCreateDirective = <
  Prefix extends string = '',
  Media extends EmptyObject = EmptyObject,
  Theme extends EmptyObject = EmptyObject,
  ThemeMap extends EmptyObject = DefaultThemeMap,
  Utils extends EmptyObject = EmptyObject,
>(config?: {
  media?: ConfigType.Media<Media>
  prefix?: ConfigType.Prefix<Prefix>
  theme?: ConfigType.Theme<Theme>
  themeMap?: ConfigType.ThemeMap<ThemeMap>
  utils?: ConfigType.Utils<Utils>
}) => {
  console.log(config)
  const stitches = createStitches(config)
  const createDirective = <
    Composers extends (string | Util.Function | {[name: string]: unknown})[],
    CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>,
  >(
    ...systems: {
      // Strings and Functions can be skipped over
      [K in keyof Composers]: Composers[K] extends string | Util.Function
        ? Composers[K]
        : RemoveIndex<CSS> & {
            /** The **variants** property lets you to set a subclass of styles based on a combination of active variants.
             *
             * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
             */
            compoundVariants?: (('variants' extends keyof Composers[K]
              ? {
                  [Name in keyof Composers[K]['variants']]?:
                    | Util.Widen<keyof Composers[K]['variants'][Name]>
                    | Util.String
                } & Util.WideObject
              : Util.WideObject) & {
              css: CSS
            })[]
            /** The **defaultVariants** property allows you to predefine the active key-value pairs of variants.
             *
             * [Read Documentation](https://stitches.dev/docs/variants#default-variants)
             */
            defaultVariants?: 'variants' extends keyof Composers[K]
              ? {
                  [Name in keyof Composers[K]['variants']]?:
                    | Util.Widen<keyof Composers[K]['variants'][Name]>
                    | Util.String
                }
              : Util.WideObject
            /** The **variants** property lets you set a subclass of styles based on a key-value pair.
             *
             * [Read Documentation](https://stitches.dev/docs/variants)
             */
            variants?: {
              [Name in string]: {
                [Pair in number | string]: CSS
              }
            }
          } & CSS & {
              [K2 in keyof Composers[K]]: K2 extends
                | 'compoundVariants'
                | 'defaultVariants'
                | 'variants'
                ? unknown
                : K2 extends keyof CSS
                ? CSS[K2]
                : unknown
            }
    }
  ) => {
    const {css} = stitches

    const system = css(...(systems as any))

    const directive: ObjectDirective = {
      getSSRProps(binding) {
        const className = getClassName(system, binding)
        return {
          class: className,
        }
      },
      // no way to test with the stitches
      mounted(el: StitchesElement, binding) {
        updateClassName(system, el, binding)
      },
      // no way to test with the stitches
      updated(el: StitchesElement, binding) {
        updateClassName(system, el, binding)
      },
    }

    return {
      directive,
      system,
    }
  }
  return {
    ...stitches,
    createDirective,
  }
}
