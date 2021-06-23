/* eslint-disable prefer-destructuring */
import createEmotionOriginal, {
  Emotion as _Emotion,
  CSSObject,
  EmotionCache,
  Options as OriginalEmotionOptions,
} from '@emotion/css/create-instance'
import {Interpolation, serializeStyles} from '@emotion/serialize'
import {getRegisteredStyles, insertStyles} from '@emotion/utils'
import {isSSR} from '@winter-love/utils'
import clsx, {ClassValue} from 'clsx'
import {
  ComponentObjectPropsOptions,
  DefineComponent,
  defineComponent,
  ExtractPropTypes,
  Fragment,
  FunctionalComponent,
  getCurrentInstance,
  h,
  inject,
  InjectionKey,
  Plugin,
} from 'vue-demi'
import {Tags} from './tags'

export interface Theme {
  size?: any
}

export type {CSSObject}

export const EMOTION_CACHE_CONTEXT: InjectionKey<EmotionCache> = Symbol('emotion-cash')
export const EMOTION_THEME_CONTEXT: InjectionKey<Theme> = Symbol('emotion-theme')

export type AnyComponent = Tags | FunctionalComponent<any> | ReturnType<typeof defineComponent>

export interface StyledProps {
  as?: AnyComponent
  theme?: Theme
}

export const useTheme = (theme: Theme = {}) => {
  const instance = getCurrentInstance()
  const props = instance?.props ?? {}

  if (props.theme) {
    return props.theme as Theme
  }

  return inject(EMOTION_THEME_CONTEXT, theme)
}

export interface StyledOptions {
  label?: string
  name?: string
  stylePortal?: string
  target?: string
}

export interface StyledOptionWIthObject<PropsOptions extends Readonly<ComponentObjectPropsOptions>>
  extends StyledOptions {
  props?: PropsOptions
}

export interface StyledOptionWithArray<PropsOptions extends Readonly<any[]>> extends StyledOptions {
  props?: PropsOptions
}

export type StyledResult<Props> = ((...args: (TemplateStringsArray | Interpolation<Props>)[]) => DefineComponent<Props>)

const defaultProps = {
  as: null,
  theme: null,
}

export type EmptyObject = {
  // empty
}

export interface StylePortalInfo {
  __stylePortal?: string
}

const getProps = (props: Record<string, any>, shouldForwardProps: Record<string, true>, stylePortal?: string) => {
  if (stylePortal) {
    const {[stylePortal]: styleProps, ...rest} = props
    const newProps = typeof styleProps === 'object' && !Array.isArray(styleProps) ? styleProps : {}
    return {
      props: newProps,
      rest,
    }
  }
  return Object.keys(props).reduce((result, key) => {
    if (shouldForwardProps[key]) {
      result.props[key] = props[key]
      return result
    }
    result.rest[key] = props[key]
    return result
  }, {props: {}, rest: {}})
}

export const toBeClassName = (value: any): ClassValue => {
  if (typeof value === 'function') {
    return
  }
  return value
}

export const createStyled = (emotion: _Emotion & {theme?: any}) => {
  function styled<PropsOptions extends ComponentObjectPropsOptions = EmptyObject>(
    element: Tags | any,
    options?: Readonly<StyledOptionWIthObject<PropsOptions>>,
  ): StyledResult<ExtractPropTypes<PropsOptions>>
  function styled<PropNames extends string,
    PropsOptions = { [key in PropNames]: any },
    >(
    element: Tags | any,
    options?: Readonly<StyledOptionWithArray<PropNames[]>>,
  ): StyledResult<ExtractPropTypes<PropsOptions>>
  function styled(element: AnyComponent, options?: any): any {
    const {
      label, target, name, props: styleProps = {},
      stylePortal,
    } = options ?? {}

    const _target = target ? ` ${target}` : ''

    const stylePropsFilter = Object.keys(styleProps).reduce((result, key) => {
      result[key] = true
      return result
    }, {})

    if (process.env.NODE_ENV === 'development' && defaultProps[stylePortal] === null) {
      console.warn('stylePortal should not be as or theme')
    }

    return (...args: any[]) => {
      const _args = [...args, {label}]

      const {cache: masterCache, theme: masterTheme} = emotion

      // eslint-disable-next-line max-statements
      const Emotion: FunctionalComponent<Record<string, any>> & StylePortalInfo = (props, {attrs, slots}) => {
        const {as} = props

        const _element = as ?? element
        const theme = useTheme(masterTheme)
        const cache = inject(EMOTION_CACHE_CONTEXT, masterCache)
        const isStringElement = typeof _element === 'string'

        const nextStylePortal = isStringElement ? undefined : _element.__stylePortal

        const classInterpolations: string[] = []
        const {class: classes, ...restAttrs} = attrs

        const {props: styleProps, rest: restProps} = getProps(restAttrs, stylePropsFilter, stylePortal)

        const allAttrs = {
          ...styleProps,
          theme,
        }
        const registeredClassName = getRegisteredStyles(
          cache.registered,
          classInterpolations,
          clsx(toBeClassName(classes)),
        )

        const serialized = serializeStyles(
          [..._args, ...classInterpolations],
          cache.registered,
          allAttrs,
        )

        const rules = insertStyles(
          cache,
          serialized,
          isStringElement,
        )

        const className = `${registeredClassName} ${cache.key}-${serialized.name}${_target}`

        const nextAttrs = isStringElement ? restProps : (
          nextStylePortal ? {...restProps, [nextStylePortal]: styleProps} : {...restProps, ...styleProps}
        )

        const vNode = h(_element, {...nextAttrs, class: className}, slots)

        if (isSSR() && typeof rules !== 'undefined') {
          let next = serialized.next
          let dataEmotion = serialized.name

          while (typeof next !== 'undefined') {
            dataEmotion += ` ${next.name}`
            next = next.next
          }

          return (
            h(Fragment, [
              h('style', {'data-emotion': dataEmotion, nonce: cache.sheet.nonce}, rules),
              vNode,
            ])
          )
        }

        return vNode
      }

      // emotion component
      // const component = defineComponent({
      //   inheritAttrs: false,
      //   name: name ?? label ?? 'emotion',
      //   props: defaultProps,
      //   setup: (props, {attrs, slots}) => {
      //     const asRef = toRef(props, 'as')
      //     const theme = useTheme()
      //
      //     const cache = inject(EMOTION_CACHE_CONTEXT, masterCache)
      //     const elementRef = computed(() => {
      //       return asRef.value ?? element
      //     })
      //     const isStringElementRef = computed(() => {
      //       return typeof elementRef.value === 'string'
      //     })
      //
      //     const nextStylePortal = computed(() => {
      //       if (isStringElementRef.value) {
      //         return
      //       }
      //       return elementRef.value.__stylePortal
      //     })
      //
      //     return () => {
      //       const classInterpolations: string[] = []
      //       const {class: classes, ...restAttrs} = attrs
      //
      //       const {props, rest: restProps} = getProps(restAttrs, stylePropsFilter, stylePortal)
      //
      //       const allAttrs = {
      //         ...props,
      //         theme,
      //       }
      //       const registeredClassName = getRegisteredStyles(
      //         cache.registered,
      //         classInterpolations,
      //         clsx(toBeClassName(classes)),
      //       )
      //
      //       const serialized = serializeStyles(
      //         [..._args, ...classInterpolations],
      //         cache.registered,
      //         allAttrs,
      //       )
      //
      //       const rules = insertStyles(
      //         cache,
      //         serialized,
      //         isStringElementRef.value,
      //       )
      //
      //       const className = `${registeredClassName} ${cache.key}-${serialized.name}${_target}`
      //
      //       const nextAttrs = isStringElementRef.value ? restProps : (
      //         nextStylePortal.value ? {...restProps, [nextStylePortal.value]: props} : {...restProps, ...props}
      //       )
      //
      //       const vNode = h(elementRef.value, {...nextAttrs, class: className}, slots)
      //
      //       if (isSSR() && typeof rules !== 'undefined') {
      //         let next = serialized.next
      //         let dataEmotion = serialized.name
      //
      //         while (typeof next !== 'undefined') {
      //           dataEmotion += ` ${next.name}`
      //           next = next.next
      //         }
      //
      //         return (
      //           h(Fragment, [
      //             h('style', {'data-emotion': dataEmotion, nonce: cache.sheet.nonce}, rules),
      //             vNode,
      //           ])
      //         )
      //       }
      //
      //       return vNode
      //     }
      //   },
      // })
      //
      Emotion.__stylePortal = stylePortal
      Emotion.displayName = name ?? label ?? 'emotion'
      Emotion.props = defaultProps

      return Emotion
    }
  }

  return styled
}

export interface EmotionExtend extends _Emotion {
  styled: ReturnType<typeof createStyled>
}

export interface EmotionOptions extends Omit<OriginalEmotionOptions, 'key'> {
  key?: string
  theme?: Theme
}

export type EmotionPlugin = Plugin & EmotionExtend

export const createEmotion = (options: EmotionOptions = {}): EmotionPlugin => {
  const {theme, key = 'css', ...restOptions} = options

  const emotion = createEmotionOriginal({...restOptions, key})

  const styled = createStyled(emotion)

  return {
    ...emotion,
    install: (app) => {
      app.provide(EMOTION_CACHE_CONTEXT, emotion.cache)

      if (process.env.NODE_ENV === 'development') {
        console.log('winter-love emotion version salmon')
      }
      // provide theme if the options have it
      if (theme) {
        app.provide(EMOTION_THEME_CONTEXT, theme)
      }
    },
    styled,
  }
}
