import {Emotion as _Emotion} from '@emotion/css/create-instance'
import {Interpolation, serializeStyles} from '@emotion/serialize'
import {getRegisteredStyles, insertStyles} from '@emotion/utils'
import {ExtractPropTypesForUsing, margeProps} from '@winter-love/use'
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
import {EMOTION_CACHE_CONTEXT} from './cache'
import {Tags} from './tags'
import {useTheme} from './theme'
import {AnyComponent, EmptyObject, SFC, StyledOptionWithArray, StyledOptionWIthObject, StylePortalInfo} from './types'

export type StyledResult<PropsOptions> =
  ((...args: (TemplateStringsArray | Interpolation<ExtractPropTypes<PropsOptions>>)[]) =>
    DefineComponent<ExtractPropTypesForUsing<PropsOptions>>)

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

interface GetNextPropsOptions {
  /**
   * @default false
   */
  inheritStyleProps?: boolean

  /**
   * @default false
   */
  isStringElement?: boolean

  nextStylePortal?: string
}

const getNextProps = (styleProps, restProps, options: GetNextPropsOptions = {}) => {
  const {
    isStringElement = false,
    nextStylePortal,
    inheritStyleProps = false,
  } = options
  if (isStringElement) {
    return restProps
  }

  const _styleProps = inheritStyleProps ? styleProps : {}

  if (nextStylePortal) {
    return {
      ...restProps,
      [nextStylePortal]: _styleProps,
    }
  }

  return {
    ...restProps,
    ..._styleProps,
  }
}

/**
 * creates new Styled function
 * @param emotion
 */
// eslint-disable-next-line max-lines-per-function
export const createStyled = (emotion: _Emotion & {theme?: any}) => {
  function styled<PropsOptions extends ComponentObjectPropsOptions = EmptyObject>(
    element: PossibleElement,
    options?: Readonly<StyledOptionWIthObject<PropsOptions>>,
  ): StyledResult<PropsOptions>
  function styled<PropNames extends string,
    PropsOptions = { [key in PropNames]: any },
    >(
    element: PossibleElement,
    options?: Readonly<StyledOptionWithArray<PropNames[]>>,
  ): StyledResult<PropsOptions>
  function styled(element: AnyComponent, options?: any): any {
    const {
      label: _label,
      target,
      name,
      props: stylePropsOptions = {},
      styleDefaults = {},
      stylePortal,
      nextStylePortal,
      passAs = false,
      inheritStyleProps = true,
    } = options ?? {}

    const label = _label === true ? name : _label

    const _target = target ? ` ${target}` : ''

    // const getProps = createGetProps(stylePropsOptions, stylePortal)

    if (process.env.NODE_ENV === 'development' && defaultProps[stylePortal] === null) {
      console.warn('stylePortal should not be as or theme')
    }

    return (...args: any[]) => {
      const _args = [...args, {label}]

      const {cache: masterCache, theme: masterTheme} = emotion

      // eslint-disable-next-line max-statements
      const Emotion: FunctionalComponent<Record<string, any>> & StylePortalInfo = (props, {attrs, slots}) => {
        const {as, theme: themeInProps, ...restProps} = props
        const styleProps = {...styleDefaults, ...(stylePortal ? props[stylePortal] : restProps)}
        const _element = passAs ? element : (as ?? element)
        const theme = useTheme(masterTheme)
        const cache = inject(EMOTION_CACHE_CONTEXT, masterCache)
        const isStringElement = typeof _element === 'string'

        // nextStylePortal 가져오기
        const _nextStylePortal = isStringElement
          ? undefined
          : (nextStylePortal ?? _element.stylePortal ?? _element.__stylePortal)
        const classInterpolations: string[] = []
        const {class: classes, ...restNextAttrs} = attrs
        // const {props: styleProps, rest: restNextAttrs} = getProps(restAttrs)

        // 만약 as 를 다음으로 넘긴다면
        if (passAs) {
          restNextAttrs.as = as
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

        const nextAttrs = getNextProps(styleProps, restNextAttrs, {
          inheritStyleProps,
          isStringElement,
          nextStylePortal: _nextStylePortal,
        })

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

      if (process.env.NODE_ENV !== 'production') {
        try {
          Reflect.defineProperty(Emotion, 'name', {
            configurable: false,
            value: Emotion.displayName,
          })
        } catch {
          // skip
        }
      }

      Emotion.props = margeProps({...stylePropsOptions, ...(stylePortal ? {[stylePortal]: null} : {})}, defaultProps)

      return Emotion
    }
  }

  return styled
}
