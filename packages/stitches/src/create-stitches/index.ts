/// <reference types="vue/jsx" />
/* eslint-disable @typescript-eslint/ban-types,@typescript-eslint/naming-convention */
import {createStitches} from '@stitches/core'
import type {ConfigType, DefaultThemeMap} from '@stitches/core/types/config'
import type * as CSSUtil from '@stitches/core/types/css-util'
import type * as StyledComponent from '@stitches/core/types/styled-component'
import * as ThemeUtil from '@stitches/core/types/theme'
import type * as Util from '@stitches/core/types/util'
import {createComponentName} from 'src/create-component-name'
import {createFakeStitches} from 'src/create-fake-stitches'
import {getClassName} from 'src/get-class-name'
import {updateClassName} from 'src/update-class-name'
import {
  Component,
  ComponentPropsOptions,
  computed,
  defineComponent,
  h,
  ObjectDirective,
  SetupContext,
  toRef,
} from 'vue'
import {$$$CSS_COMPONENT_PROPS, getComposersProps} from '../get-composers-props'

export interface StyledVueComponent<
  Type = 'span',
  Props = {},
  Media = {},
  CSS = {},
  E = {},
> {
  [StyledComponent.$$StyledComponentMedia]: Media
  [StyledComponent.$$StyledComponentProps]: Props
  [StyledComponent.$$StyledComponentType]: Type
  className?: string
  props?: ComponentPropsOptions<
    StyledComponent.TransformProps<Props, Media> & {
      as?: any
      css?: CSS
    }
  >

  (
    props: StyledComponent.TransformProps<Props, Media> & {
      as?: any
      css?: CSS
    },
    ctx: Omit<SetupContext<E>, 'expose'>,
  ): any
}

export type RemoveIndex<T> = {
  [k in keyof T as string extends k ? never : number extends k ? never : k]: T[k]
}

export type ThemeTokens<Values, Prefix> = {
  [Scale in keyof Values]: {
    [Token in keyof Values[Scale]]: ThemeUtil.Token<
      Extract<Token, number | string>,
      Values[Scale][Token] & (string | number),
      Extract<Scale, string | void>,
      Extract<Prefix, string | void>
    >
  }
}

export interface VueStitches<
  Prefix extends string = '',
  Media extends {} = {},
  Theme extends {} = {},
  ThemeMap extends {} = {},
  Utils extends {} = {},
> {
  config: {
    media: Media
    prefix: Prefix
    theme: Theme
    themeMap: ThemeMap
    utils: Utils
  }
  createDirective: {
    <
      Composers extends (string | Util.Function | {[name: string]: unknown})[],
      CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>,
    >(
      ...composers: {
        [K in keyof Composers]: string extends Composers[K]
          ? Composers[K]
          : Composers[K] extends string | Util.Function
          ? Composers[K]
          : RemoveIndex<CSS> & {
              /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
               *
               * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
               */
              compoundVariants?: (('variants' extends keyof Composers[K]
                ? {
                    [Name in keyof Composers[K]['variants']]?:
                      | Util.Widen<keyof Composers[K]['variants'][Name]>
                      | Util.String
                  }
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
    ): ObjectDirective
  }
  createTheme: {
    <
      Argument0 extends
        | string
        | ({
            [Scale in keyof Theme]?: {
              [Token in keyof Theme[Scale]]?: boolean | number | string
            }
          } & {
            [scale in string]: {
              [token in number | string]: boolean | number | string
            }
          }),
      Argument1 extends
        | string
        | ({
            [Scale in keyof Theme]?: {
              [Token in keyof Theme[Scale]]?: boolean | number | string
            }
          } & {
            [scale in string]: {
              [token in number | string]: boolean | number | string
            }
          }),
    >(
      nameOrScalesArg0: Argument0,
      nameOrScalesArg1?: Argument1,
    ): string & {
      className: string
      selector: string
    } & (Argument0 extends string
        ? ThemeTokens<Argument1, Prefix>
        : ThemeTokens<Argument0, Prefix>)
  }
  css: {
    <
      Composers extends (string | Util.Function | {[name: string]: unknown})[],
      CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>,
    >(
      ...composers: {
        // Strings and Functions can be skipped over
        [K in keyof Composers]: string extends Composers[K]
          ? Composers[K]
          : Composers[K] extends string | Util.Function
          ? Composers[K]
          : RemoveIndex<CSS> & {
              /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
               *
               * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
               */
              compoundVariants?: (('variants' extends keyof Composers[K]
                ? {
                    [Name in keyof Composers[K]['variants']]?:
                      | Util.Widen<keyof Composers[K]['variants'][Name]>
                      | Util.String
                  }
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
    ): StyledComponent.CssComponent<
      StyledComponent.StyledComponentType<Composers>,
      StyledComponent.StyledComponentProps<Composers>,
      Media,
      CSS
    >
  }
  getCssText: {
    (): string
  }
  globalCss: {
    <Styles extends {[K: string]: any}>(
      ...styles: ({
        /** The **@font-face** CSS at-rule specifies a custom font with which to display text. */
        '@font-face'?: unknown

        /** The **@import** CSS at-rule imports style rules from other style sheets. */
        '@import'?: unknown
      } & {
        [K in keyof Styles]: K extends '@import'
          ? string | string[]
          : K extends '@font-face'
          ? CSSUtil.Native.AtRule.FontFace | Array<CSSUtil.Native.AtRule.FontFace>
          : K extends `@keyframes ${string}`
          ? {
              [KeyFrame in string]: CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
            }
          : K extends `@property ${string}`
          ? CSSUtil.Native.AtRule.Property
          : CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
      })[]
    ): {
      (): string
    }
  }
  keyframes: {
    (style: {[offset: string]: CSSUtil.CSS<Media, Theme, ThemeMap, Utils>}): {
      (): string
      name: string
    }
  }
  prefix: Prefix
  styled: {
    <
      Type extends keyof JSX.IntrinsicElements | Component | Util.Function,
      Composers extends (
        | string
        | Component
        | Util.Function
        | {[name: string]: unknown}
      )[],
      CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>,
    >(
      type: Type,
      ...composers: {
        [K in keyof Composers]: string extends Composers[K]
          ? Composers[K]
          : Composers[K] extends string | Util.Function
          ? Composers[K]
          : RemoveIndex<CSS> & {
              /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
               *
               * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
               */
              compoundVariants?: (('variants' extends keyof Composers[K]
                ? {
                    [Name in keyof Composers[K]['variants']]?:
                      | Util.Widen<keyof Composers[K]['variants'][Name]>
                      | Util.String
                  }
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
    ): StyledVueComponent<
      Type,
      StyledComponent.StyledComponentProps<Composers>,
      Media,
      CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
    >
  }
  theme: string & {
    className: string
    selector: string
  } & {
    [Scale in keyof Theme]: {
      [Token in keyof Theme[Scale]]: ThemeUtil.Token<
        Extract<Token, string | number>,
        string,
        Extract<Scale, string | void>,
        Extract<Prefix, string | void>
      >
    }
  }
}

// eslint-disable-next-line max-lines-per-function
export const createVueStitches = <
  Prefix extends string = '',
  Media extends {} = {},
  Theme extends {} = {},
  ThemeMap extends {} = DefaultThemeMap,
  Utils extends {} = {},
>(config?: {
  media?: ConfigType.Media<Media>
  prefix?: ConfigType.Prefix<Prefix>
  root?: any
  theme?: ConfigType.Theme<Theme>
  themeMap?: ConfigType.ThemeMap<ThemeMap>
  utils?: ConfigType.Utils<Utils>
}): VueStitches<Prefix, Media, Theme, ThemeMap, Utils> => {
  let stitches

  /**
   * 특정 작동 환경 안에서 동작시 (발견된것은 histoire 시작 지점) cssRules.length 코드 에서 cssRules 가 undefined 에러 인경우 무시 코드 입니다 정확한 특정 환경이 무엇인지 모르는 중 입니다
   * 프로덕트 실행 환경에서 문제가 아직 없어 보입니다 만약 문제가 있다면 stitches/core 오류로 보이며 수정 요청 또는 PR 을 해야합니다
   * @see https://github.com/stitchesjs/stitches/blob/74c3b96e5cadd7d1434a3c4bc5d7cb2089cc783a/packages/core/src/sheet.js#L172-L186
   */
  try {
    stitches = createStitches(config)
  } catch {
    // 에러시 가짜 stitches 제작
    console.warn('It is created in unable environment')
    stitches = createFakeStitches()
  }

  const styled: any = (element, ...composers) => {
    const system = stitches.css(...composers)
    const name = createComponentName(element)
    const props = getComposersProps(composers)

    return defineComponent({
      name: `Styled.${name ?? 'unknown'}`,
      props:
        process.env.NODE_ENV === 'production'
          ? ['as', 'css', 'class', ...props]
          : {
              // for histoire props inspector
              ...Object.fromEntries(props.map((key) => [key, null])),
              as: null,
              class: null,
              css: null,
            },
      setup: (props: any, {slots}) => {
        const asRef = toRef(props, 'as')

        const elementRef = computed(() => {
          if (typeof element === 'string') {
            return asRef.value ?? element
          }
          return element
        })

        const nextAsProp = computed(() => {
          // only none Component element (string) use as
          if (typeof element !== 'string') {
            return asRef.value
          }
        })

        return () => {
          const {as, css, class: className, ...variants} = props
          const styledObject = system({
            ...variants,
            css,
          })

          return h(
            elementRef.value,
            {
              as: nextAsProp.value,
              class: [className, styledObject.className].join(' '),
            },
            slots,
          )
        }
      },
    })
  }

  const createDirective = (...composers): ObjectDirective => {
    const system = stitches.css(...composers)
    return {
      getSSRProps(binding) {
        const className = getClassName(system, binding)
        return {
          class: className,
        }
      },
      mounted(el: any, binding) {
        updateClassName(system, el, binding)
      },
      updated(el: any, binding) {
        updateClassName(system, el, binding)
      },
    }
  }

  const css = (...composers) => {
    const props = getComposersProps(composers)

    return Object.assign(stitches.css(...composers), {
      [$$$CSS_COMPONENT_PROPS]: props,
    })
  }

  return {
    ...stitches,
    createDirective,
    css,
    styled,
  }
}
