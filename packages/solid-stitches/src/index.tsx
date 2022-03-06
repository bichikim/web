/* eslint-disable max-lines-per-function */
import {createStitches} from '@stitches/core'
import type {ConfigType, DefaultThemeMap} from '@stitches/core/types/config'
import type * as CSSUtil from '@stitches/core/types/css-util'
import type * as Util from '@stitches/core/types/util'
import Stitches, {RemoveIndex} from '@stitches/core/types/stitches'
import {CssComponent, StyledComponentProps} from '@stitches/core/types/styled-component'
import {Component} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {EmptyObject} from './types'

export type CSSProperties = CSSUtil.CSSProperties
//

export type {EmptyObject, Component, Stitches, DefaultThemeMap}

export type Directive = <T>(element: Element, accessor: () => T) => unknown

export interface StitchesInfo {
  previousClassNames?: string[] | string | undefined
}

export type StitchesElement = Element & {
  __stitches__?: StitchesInfo
}

export const getClassName = (
  system: CssComponent,
  styleProps: any,
) => {

  if (typeof styleProps !== 'object') {
    return
  }

  return system(styleProps).className
}

const runCsxClassComponent = (system: CssComponent, csx?: any) => {
  const result = system(csx)
  const {className, ...rest} = result.props as any
  return {
    ...rest,
    class: className,
  }
}

const updateClassName = (
  system: CssComponent,
  el: StitchesElement,
  styleProps: any,
) => {
  const infoKey = '__stitches__'
  const {previousClassNames} = el[infoKey] ?? {}
  if (previousClassNames) {
    el.classList.remove(...previousClassNames)
  }

  const className = getClassName(system, styleProps)
  const classNames = className ? className.split(' ') : className

  el[infoKey] = {
    previousClassNames: classNames,
  }

  if (classNames) {
    el.classList.add(...classNames)
  }
}

const _Dynamic: any = Dynamic

export type Styled<Media, Theme, ThemeMap, Utils> = <
  Composers extends (
    | string
    | Util.Function
    | { [name: string]: unknown }
    )[],
  CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
  >(
    tag: string,
    ...composers: {
      [K in keyof Composers]: (
        // Strings and Functions can be skipped over
        Composers[K] extends string | Util.Function
          ? Composers[K]
          : RemoveIndex<CSS> & {
          /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
           *
           * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
           */
          compoundVariants?: (
            & (
              'variants' extends keyof Composers[K]
                ? {
                  [Name in keyof Composers[K]['variants']]?: Util.Widen<keyof Composers[K]['variants'][Name]>
                  | Util.String
                }
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
    ) => Component<{css: CSS} & StyledComponentProps<Composers>>

export interface SolidStitches<Prefix extends string, Media, Theme, ThemeMap, Utils> extends
  Stitches<Prefix, Media, Theme, ThemeMap, Utils> {
  createDirective: {
    <
      Composers extends (
        | string
        | Util.Function
        | { [name: string]: unknown }
        )[],
      CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
      >(
      ...composers: {
        [K in keyof Composers]: (
          // Strings and Functions can be skipped over
          Composers[K] extends string | Util.Function
            ? Composers[K]
            : RemoveIndex<CSS> & {
            /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
             *
             * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
             */
            compoundVariants?: (
              & (
                'variants' extends keyof Composers[K]
                  ? {
                    [Name in keyof Composers[K]['variants']]?: Util.Widen<keyof Composers[K]['variants'][Name]>
                    | Util.String
                  }
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
    ): any
  }
  styled: {
    <
      Composers extends (
        | string
        | Util.Function
        | { [name: string]: unknown }
        )[],
      CSS = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
      >(
      tag: string,
      ...composers: {
        [K in keyof Composers]: (
          // Strings and Functions can be skipped over
          Composers[K] extends string | Util.Function
            ? Composers[K]
            : RemoveIndex<CSS> & {
            /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
             *
             * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
             */
            compoundVariants?: (
              & (
                'variants' extends keyof Composers[K]
                  ? {
                    [Name in keyof Composers[K]['variants']]?: Util.Widen<keyof Composers[K]['variants'][Name]>
                    | Util.String
                  }
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
    ) : Component<{css: CSS} & StyledComponentProps<Composers>>
  }
}

export interface StitchesConfig<
  Prefix extends string = '',
  Media extends EmptyObject = EmptyObject,
  Theme extends EmptyObject = EmptyObject,
  ThemeMap extends EmptyObject = DefaultThemeMap,
  Utils extends EmptyObject = EmptyObject,
  > {
  media?: ConfigType.Media<Media>
  prefix?: ConfigType.Prefix<Prefix>
  theme?: ConfigType.Theme<Theme>
  themeMap?: ConfigType.ThemeMap<ThemeMap>
  utils?: ConfigType.Utils<Utils>
}

export const createSolidStitches = <
  Prefix extends string = '',
  Media extends EmptyObject = EmptyObject,
  Theme extends EmptyObject = EmptyObject,
  ThemeMap extends EmptyObject = DefaultThemeMap,
  Utils extends EmptyObject = EmptyObject,
  >(
    config?: StitchesConfig<Prefix, Media, Theme, ThemeMap, Utils>,
  ): SolidStitches<Prefix, Media, Theme, ThemeMap, Utils> => {
  const stitches: Stitches<Prefix, Media, Theme, ThemeMap, Utils> = createStitches<
    Prefix, Media, Theme, ThemeMap, Utils>(config)
  const createDirective = (
    ...composers: any[]
  ) => {
    const {css} = stitches

    const system = css(...composers as any)

    return (element: Element, accessor: () => any) => {
      const styleProps = accessor()
      updateClassName(system, element, styleProps)
    }
  }

  const styled = (
    tag: string,
    ...composers: any[]
  ): Component<Record<string, any>> => {
    const {css} = stitches
    const system = css(...composers as any)

    return (props) => {
      return (
        <_Dynamic component={tag} {...runCsxClassComponent(system, props)} />
      ) as any
    }
  }

  return {
    ...stitches,
    createDirective,
    styled,
  }
}
