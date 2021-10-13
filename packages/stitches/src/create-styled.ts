import {ConfigType, DefaultThemeMap as DefaultThemeMap_} from '@stitches/core/types/config'
import {CSS as CSS_} from '@stitches/core/types/css-util'
import {RemoveIndex as RemoveIndex_} from '@stitches/core/types/stitches'
import {
  Function as Function_,
  String as String_,
  Widen as Widen_,
  WideObject as WideObject_,
} from '@stitches/core/types/util'
import {EmptyObject} from '@winter-love/utils'
import {computed, defineComponent, h, toRef, withDirectives} from 'vue-demi'
import {createCreateDirective} from './create-directive'

export type CSS = CSS_
export type RemoveIndex<T> = RemoveIndex_<T>
export type Function = Function_
export type String = Function_
export type Widen<T> = Widen_<T>
export type WideObject = WideObject_
export type Media = ConfigType.Media
export type Prefix = ConfigType.Prefix
export type Theme = ConfigType.Theme
export type ThemeMap = ConfigType.ThemeMap
export type Utils = ConfigType.Utils
export type DefaultThemeMap = DefaultThemeMap_

export interface StyledOptions {
  name?: string
  target?: string
}

export const createStyled = <Prefix extends string = string,
  Media extends EmptyObject = EmptyObject,
  Theme extends EmptyObject = EmptyObject,
  ThemeMap extends EmptyObject = DefaultThemeMap,
  Utils extends EmptyObject = EmptyObject>(config?: {
  media?: ConfigType.Media<Media>
  prefix?: ConfigType.Prefix<Prefix>
  theme?: ConfigType.Theme<Theme>
  themeMap?: ConfigType.ThemeMap<ThemeMap>
  utils?: ConfigType.Utils<Utils>
}) => {

  const {createDirective, ...stitches} = createCreateDirective(config)

  const styled = <Composers extends (
    | string
    | Function_
    | {[name: string]: unknown}
    )[],
    CSS = CSS_<Media, Theme, ThemeMap, Utils>>(
      element, options: StyledOptions = {}, ...systems: {
      [K in keyof Composers]: (
        // Strings and Functions can be skipped over
        Composers[K] extends string | Function_
          ? Composers[K]
          : RemoveIndex<CSS> & {
          /** The **variants** property lets you to set a subclass of styles based on a combination of active variants.
           *
           * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
           */
          compoundVariants?: (
            & (
              'variants' extends keyof Composers[K]
                ? {
                [Name in keyof Composers[K]['variants']]?: Widen<keyof Composers[K]['variants'][Name]>
                | String_
              } & WideObject
                : WideObject
              )
            & {
            css: CSS
          }
            )[]
          /** The **defaultVariants** property allows you to predefine the active key-value pairs of variants.
           *
           * [Read Documentation](https://stitches.dev/docs/variants#default-variants)
           */
          defaultVariants?: (
            'variants' extends keyof Composers[K]
              ? {
                [Name in keyof Composers[K]['variants']]?: Widen<keyof Composers[K]['variants'][Name]>
                | String_
              }
              : WideObject
            )
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
          [K2 in keyof Composers[K]]: K2 extends 'compoundVariants' | 'defaultVariants' | 'variants'
            ? unknown
            : K2 extends keyof CSS
              ? CSS[K2]
              : unknown
        }
        )
    }
    ) => {
    const {name, target} = options
    const directive = createDirective<Composers,
      CSS>(...systems)
    return defineComponent({
      name,
      props: {
        as: {type: String},
        css: {default: () => ({}), type: Object},
        variants: {default: () => ({}), type: Object},
      },
      setup(props, {slots}) {
        const asRef = toRef(props, 'as')

        const elementRef = computed(() => {
          return asRef.value ?? element
        })

        return () => (
          withDirectives(h(elementRef.value, {class: target}, {...slots}), [[directive, [props.css, props.variants]]])
        )
      },
    })
  }

  return {
    ...stitches,
    createDirective,
    styled,
  }
}
