import {Emotion as _Emotion} from '@emotion/css/create-instance'
import {Interpolation, serializeStyles} from '@emotion/serialize'
import {getRegisteredStyles, insertStyles} from '@emotion/utils'
import {ExtractPropTypesForUsing, margeProps} from '@winter-love/use'
import {isSSR} from '@winter-love/utils'
import clsx, {ClassValue} from 'clsx'
import {
  ComponentObjectPropsOptions,
  defineComponent,
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
import {AnyComponent, EmptyObject, SFC, StyledOptionWithArray, StyledOptionWIthObject} from './types'

type KeyAndObject<Key extends string | undefined> = Key extends string ? { [P in Key]: null } : EmptyObject

export type StyledResult<PropsOptions, StylePortal extends string | undefined> =
  ((...args: (TemplateStringsArray | Interpolation<ExtractPropTypes<PropsOptions> & {theme: Record<string, any>}>)[]) =>
    DefineComponent<ExtractPropTypesForUsing<PropsOptions & KeyAndObject<StylePortal>>>)

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

/**
 * creates new Styled function
 * @param emotion
 */
// eslint-disable-next-line max-lines-per-function
export const createStyled = (emotion: _Emotion & {theme?: any}) => {
  function styled<PropsOptions extends ComponentObjectPropsOptions = Record<string, any>,
    StylePortal extends string | undefined = undefined>
  (
    element: PossibleElement,
    options?: Readonly<StyledOptionWIthObject<PropsOptions, StylePortal>>,
  ): StyledResult<PropsOptions, StylePortal>
  function styled<PropNames extends string, PropsOptions = { [key in PropNames]: any },
    StylePortal extends string | undefined = undefined>
  (
    element: PossibleElement,
    options?: Readonly<StyledOptionWithArray<PropNames[], StylePortal>>,
  ): StyledResult<PropsOptions, StylePortal>
  function styled(element: AnyComponent, options?: any): any {
    const {
      label: _label,
      target,
      name,
      props: stylePropsOptions = {},
      stylePortal,
      passAs = false,
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

      return defineComponent({
        computed: {
          rootElement() {
            return this.$refs.root
          },
        },
        name: name || label || 'emotion',
        props: margeProps({...stylePropsOptions, ...(stylePortal ? {[stylePortal]: null} : {})}, defaultProps),
        setup(props, {attrs, slots}) {
          const theme = useTheme(masterTheme)
          const cache = inject(EMOTION_CACHE_CONTEXT, masterCache)

          // eslint-disable-next-line max-statements
          return () => {
            const {as, theme: themeInProps, ...restProps} = props
            const _restProps = stylePortal ? {...restProps, [stylePortal]: undefined} : restProps
            const styleProps = {..._restProps, ...(stylePortal ? props[stylePortal] : _restProps)}
            const _element = passAs ? element : (as ?? element)

            const isStringElement = typeof _element === 'string'

            const classInterpolations: string[] = []
            const {class: classes, ...restNextAttrs} = attrs

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

            const className = `${registeredClassName}${cache.key}-${serialized.name}${_target}`

            const vNode = h(_element, {...restNextAttrs, class: className, ref: 'root'}, slots)

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
        },
      })
    }
  }

  return styled
}
