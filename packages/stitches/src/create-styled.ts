import {ConfigType, DefaultThemeMap} from '@stitches/core/types/config'
import * as CSSUtil from '@stitches/core/types/css-util'
import {RemoveIndex} from '@stitches/core/types/stitches'
import * as Util from '@stitches/core/types/util'
import {EmptyObject} from '@winter-love/utils'
import {computed, defineComponent, h, toRef, withDirectives} from 'vue-demi'
import {createCreateDirective} from './create-directive'

export interface StyledOptions {
  name?: string
  target?: string
}

export const createStyled = <
  Prefix extends string = string,
  Media extends EmptyObject = EmptyObject,
  Theme extends EmptyObject = EmptyObject,
  ThemeMap extends EmptyObject = DefaultThemeMap,
  Utils extends EmptyObject = EmptyObject
  >(config?: {
  media?: ConfigType.Media<Media>
  prefix?: ConfigType.Prefix<Prefix>
  theme?: ConfigType.Theme<Theme>
  themeMap?: ConfigType.ThemeMap<ThemeMap>
  utils?: ConfigType.Utils<Utils>
}) => {

  const {createDirective, ...stitches} = createCreateDirective(config)

  function styled<
    Composers extends(
      | string
      | Util.Function
      | { [name: string]: unknown }
      )[],
    CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
    >(element, options: StyledOptions = {}, ...systems: {
    [K in keyof Composers]: (
      // Strings and Functions can be skipped over
      Composers[K] extends string | Util.Function
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
              [Name in keyof Composers[K]['variants']]?: Util.Widen<keyof Composers[K]['variants'][Name]>
              | Util.String
            } & Util.WideObject
              : Util.WideObject
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
              [Name in keyof Composers[K]['variants']]?: Util.Widen<keyof Composers[K]['variants'][Name]>
              | Util.String
            }
            : Util.WideObject
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
  ) {
    const {name, target} = options
    const directive = createDirective<
      Composers,
      CSS
      >(...systems)
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
