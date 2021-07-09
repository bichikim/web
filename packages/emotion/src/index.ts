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

export type StyledFunctionalComponent = FunctionalComponent & {
  stylePortal?: string
}

export type SFC = StyledFunctionalComponent
export type FC = FunctionalComponent

export interface Theme {
  [key: string]: any
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
  nextStylePortal?: string
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

const setDefaults = (props: Record<string, any>, defaults: Record<string, string | number | (() => any)>) => {
  const _props = {...props}

  Object.keys(defaults).forEach((key) => {
    if (typeof _props[key] !== 'undefined') {
      return
    }
    const value = defaults[key]
    if (typeof value === 'function') {
      _props[key] = value()
    }
    _props[key] = value
  })
  return _props
}

const createGetProps = (propOptions: ComponentObjectPropsOptions | Readonly<string[]>, stylePortal?: string) => {
  const propOptionsKeys = Array.isArray(propOptions) ? propOptions : Object.keys(propOptions)

  const {shouldForwardProps, defaults} = propOptionsKeys.reduce((result, key) => {
    const defaultValue = propOptions[key]?.default
    if (defaultValue) {
      result.defaults[key] = defaultValue
    }
    result.shouldForwardProps[key] = true
    return result
  }, {defaults: {}, shouldForwardProps: {}})

  return (attrs: Record<string, any>) => {

    if (stylePortal) {
      const {[stylePortal]: styleProps, ...rest} = attrs
      const newProps = typeof styleProps === 'object' && !Array.isArray(styleProps) ? styleProps : {}
      return {
        props: setDefaults(newProps, defaults),
        rest,
      }
    }
    const {props, rest} = Object.keys(attrs).reduce((result, key) => {
      if (shouldForwardProps[key]) {
        result.props[key] = attrs[key]
        return result
      }
      result.rest[key] = attrs[key]
      return result
    }, {props: {}, rest: {}})
    return {
      props: setDefaults(props, defaults),
      rest,
    }
  }

}
export const toBeClassName = (value: any): ClassValue => {
  if (typeof value === 'function') {
    return
  }
  return value
}

/**
 * creates new Styled function
 * @param emotion
 */
export const createStyled = (emotion: _Emotion & {theme?: any}) => {
  function styled<PropsOptions extends ComponentObjectPropsOptions = EmptyObject>(
    element: Tags | SFC | any,
    options?: Readonly<StyledOptionWIthObject<PropsOptions>>,
  ): StyledResult<ExtractPropTypes<PropsOptions>>
  function styled<PropNames extends string,
    PropsOptions = { [key in PropNames]: any },
    >(
    element: Tags | SFC | any,
    options?: Readonly<StyledOptionWithArray<PropNames[]>>,
  ): StyledResult<ExtractPropTypes<PropsOptions>>
  function styled(element: AnyComponent, options?: any): any {
    const {
      label, target, name, props: stylePropsOptions = {},
      stylePortal, nextStylePortal,
    } = options ?? {}

    const _target = target ? ` ${target}` : ''

    const getProps = createGetProps(stylePropsOptions, stylePortal)

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
        const _nextStylePortal = isStringElement
          ? undefined
          : (nextStylePortal ?? _element.stylePortal ?? _element.__stylePortal)
        const classInterpolations: string[] = []
        const {class: classes, ...restAttrs} = attrs
        const {props: styleProps, rest: restProps} = getProps(restAttrs)
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
          _nextStylePortal ? {...restProps, [_nextStylePortal]: styleProps} : {...restProps, ...styleProps}
        )

        const vNode = h(_element, {...nextAttrs, class: className}, slots)

        if (isSSR() && typeof rules !== 'undefined') {
          // eslint-disable-next-line prefer-destructuring
          let next = serialized.next
          let dataEmotion = serialized.name

          while (typeof next !== 'undefined') {
            dataEmotion += ` ${next.name}`
            // eslint-disable-next-line prefer-destructuring
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

      Emotion.__stylePortal = stylePortal
      Emotion.inheritAttrs = false
      /**
       * dose not work for now
       * https://github.com/vuejs/devtools/issues/1494
       */
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

export interface EmotionPluginOptions {
  theme?: Theme
}

export interface EmotionOptions extends Omit<OriginalEmotionOptions, 'key'>, EmotionPluginOptions {
  key?: string
}

export type EmotionPlugin = Plugin & EmotionExtend

/**
 * creates emotion members & the styled function
 * @param options
 */
export const createEmotion = (options: EmotionOptions = {}): EmotionPlugin => {
  const {theme, key = 'css', ...restOptions} = options

  const emotion = createEmotionOriginal({...restOptions, key})

  const styled = createStyled({...emotion, theme})

  return {
    ...emotion,
    install: (app, options: EmotionPluginOptions = {}) => {
      const {theme: _theme = theme} = options
      app.provide(EMOTION_CACHE_CONTEXT, emotion.cache)

      // provide theme if the options have it
      if (_theme) {
        app.provide(EMOTION_THEME_CONTEXT, _theme)
      }
    },
    styled,
  }
}
