import {Emotion as _Emotion} from '@emotion/css/create-instance'
import {Interpolation, serializeStyles} from '@emotion/serialize'
import {getRegisteredStyles, insertStyles} from '@emotion/utils'
import {isSSR} from '@winter-love/utils'
import clsx, {ClassValue} from 'clsx'
import {
  ComponentObjectPropsOptions,
  DefineComponent,
  ExtractPropTypes,
  Fragment,
  FunctionalComponent,
  h,
  inject,
} from 'vue-demi'
import {Tags} from './tags'
import {useTheme} from './theme'
import {
  AnyComponent,
  EmptyObject,
  SFC,
  StyledOptionWithArray,
  StyledOptionWIthObject,
  StylePortalInfo,
} from './types'
import {EMOTION_CACHE_CONTEXT} from './cache'

export type StyledResult<Props> = ((...args: (TemplateStringsArray | Interpolation<Props>)[]) => DefineComponent<Props>)

const toBeClassName = (value: any): ClassValue => {
  if (typeof value === 'function') {
    return
  }
  return value
}

export type PossibleElement = Tags | FunctionalComponent | SFC | any

const defaultProps = {
  as: null,
  theme: null,
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

/**
 * creates new Styled function
 * @param emotion
 */
export const createStyled = (emotion: _Emotion & {theme?: any}) => {
  function styled<PropsOptions extends ComponentObjectPropsOptions = EmptyObject>(
    element: PossibleElement,
    options?: Readonly<StyledOptionWIthObject<PropsOptions>>,
  ): StyledResult<ExtractPropTypes<PropsOptions>>
  function styled<PropNames extends string,
    PropsOptions = { [key in PropNames]: any },
    >(
    element: PossibleElement,
    options?: Readonly<StyledOptionWithArray<PropNames[]>>,
  ): StyledResult<ExtractPropTypes<PropsOptions>>
  function styled(element: AnyComponent, options?: any): any {
    const {
      label: _label,
      target,
      name,
      props: stylePropsOptions = {},
      stylePortal,
      nextStylePortal,
      passAs = false,
    } = options ?? {}

    const label = _label === true ? name : _label

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

        const _element = passAs ? element : (as ?? element)

        if (name === 'Component5') {
          console.log(_element)
        }

        const theme = useTheme(masterTheme)
        const cache = inject(EMOTION_CACHE_CONTEXT, masterCache)
        const isStringElement = typeof _element === 'string'
        const _nextStylePortal = isStringElement
          ? undefined
          : (nextStylePortal ?? _element.stylePortal ?? _element.__stylePortal)
        const classInterpolations: string[] = []
        const {class: classes, ...restAttrs} = attrs
        const {props: styleProps, rest: restProps} = getProps(restAttrs)

        // 만약 as 를 다음으로 넘긴다면
        if (passAs) {
          restProps.as = as
        }

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
      Emotion.displayName = name || label || 'emotion'
      Emotion.props = defaultProps

      return Emotion
    }
  }

  return styled
}
