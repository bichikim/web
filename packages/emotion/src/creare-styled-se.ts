import {Emotion as _Emotion} from '@emotion/css/create-instance'
import {Interpolation, serializeStyles} from '@emotion/serialize'
import {getRegisteredStyles, insertStyles} from '@emotion/utils'
import {ExtractPropTypesForUsing} from '@winter-love/use'
import {isSSR} from '@winter-love/utils'
import clsx, {ClassValue} from 'clsx'
import {
  ComponentObjectPropsOptions,
  computed,
  defineComponent,
  DefineComponent,
  ExtractPropTypes,
  Fragment,
  FunctionalComponent,
  h,
  inject,
  toRef,
  withDirectives,
} from 'vue-demi'
import {EMOTION_CACHE_CONTEXT} from './cache'
import {Tags} from './tags'
import {useTheme} from './theme'
import {AnyComponent, EmptyObject, SFC, StyledOptionWithArray, StyledOptionWIthObject, StylePortalInfo} from './types'
import {createDirective} from './directive'

export interface StyledOption {
  name?: string
  stylePortal?: string
  target?: string
  systems?: any[]
}

export const createStyledSe = (emotion: _Emotion & {theme?: any}) => {
  const {theme, ...rest} = emotion
  const directive = createDirective(rest, {theme})

  return function styled(element: AnyComponent, options?: any): any {
    const {stylePortal = 'css', name, target, systems} = options
    return defineComponent({
      name,
      props: {
        [stylePortal]: {default: () => ({}), type: Object},
      },
      setup: (props) => {
        const cssRef = toRef(props, stylePortal)
        const directiveBind = computed(() => {
          return {...cssRef.value ?? {}, __system__: systems}
        })
        return () => (
          withDirectives(h(element), [[directive, directiveBind.value]])
        )
      },
    })
  }
}
