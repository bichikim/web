/* eslint-disable max-lines-per-function */
import {createStitches, CreateStitches} from '@stitches/core'
import {CSS as CSS_} from '@stitches/core/types/css-util'
import {
  Function as Function_,
  String as String_,
  Widen as Widen_,
  WideObject as WideObject_,
} from '@stitches/core/types/util'
import {Dynamic} from 'solid-js/web'
import {EmptyObject} from './types'
import {ConfigType, DefaultThemeMap as DefaultThemeMap_} from '@stitches/core/types/config'
import {RemoveIndex as RemoveIndex_} from '@stitches/core/types/stitches'
import {CssComponent as CssComponent_} from '@stitches/core/types/styled-component'

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
export type CssComponent = CssComponent_

export type {EmptyObject, CreateStitches}

export {createStitches}

export type Directive = <T>(element: Element, accessor: () => T) => unknown

export interface StitchesInfo {
  previousClassNames?: string[] | string | undefined
}

export type StitchesElement = Element & {
  __stitches__?: StitchesInfo
}

export const getClassName = (
  system: CssComponent_,
  styleProps: any,
) => {

  if (typeof styleProps !== 'object') {
    return
  }

  return system(styleProps).className
}

const runCsxClassComponent = (system: CssComponent_, csx?: any) => {
  const result = system(csx)
  const {className, ...rest} = result.props as any
  return {
    ...rest,
    class: className,
  }
}

const updateClassName = (
  system: CssComponent_,
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

export const createSolidStitches = <Prefix extends string = '',
  Media extends EmptyObject = EmptyObject,
  Theme extends EmptyObject = EmptyObject,
  ThemeMap extends EmptyObject = DefaultThemeMap_,
  Utils extends EmptyObject = EmptyObject,
  >(
    config?: {
      media?: ConfigType.Media<Media>
      prefix?: ConfigType.Prefix<Prefix>
      theme?: ConfigType.Theme<Theme>
      themeMap?: ConfigType.ThemeMap<ThemeMap>
      utils?: ConfigType.Utils<Utils>
  },
  ) => {
  const stitches = createStitches<Prefix, Media, Theme, ThemeMap, Utils>(config)
  const createDirective = <Composers extends (
    | string
    |Function_
    | {[name: string]: unknown}
    )[],
    CSS = CSS_<Media, Theme, ThemeMap, Utils>>(
      ...systems: {
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
    const {css} = stitches

    const system = css(...systems as any)

    return (element: Element, accessor: () => any) => {
      const styleProps = accessor()
      updateClassName(system, element, styleProps)
    }
  }

  const styled = <Composers extends (
    | string
    | Function_
    | {[name: string]: unknown}
    )[],
    CSS = CSS_<Media, Theme, ThemeMap, Utils>>(
      tag: string,
      ...systems: {
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
    ): any => {
    const {css} = stitches
    const system = css(...systems as any)

    return (props) => {
      return (
        <_Dynamic component={tag} {...runCsxClassComponent(system, props)} />
      )
    }
  }

  return {
    ...stitches,
    createDirective,
    styled,
  }
}
