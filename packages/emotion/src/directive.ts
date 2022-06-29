import {Emotion as _Emotion, CSSInterpolation, CSSObject} from '@emotion/css/create-instance'
import {DirectiveBinding, ObjectDirective} from 'vue-demi'

export interface EmotionAdditionOptions {
  setSystem: (system?: (props: any) => CSSObject) => any
  setTheme: (theme?: any) => any
}

export interface EmotionInfo {
  previousClassName?: string
}

export type EmotionElement = Element & {
  __emotion__?: EmotionInfo
}

export interface CreateDirectiveOptions {
  systems?: Record<string, ((props: any) => CSSObject | CSSInterpolation)[]>
  theme?: Record<string, any>
}

export const createDirective = (
  emotion: _Emotion,
  options: CreateDirectiveOptions = {},
): ObjectDirective => {
  const {css} = emotion
  const {theme = {}, systems = (props: any) => props} = options

  const getCss = (props: any, theme, systemName: string = 'default') => {
    const {__system__, theme: _theme, ...restProps} = props

    const system: ((props: any) => CSSObject | CSSInterpolation)[] = __system__ ??
      systems[systemName] ?? [
        function defaultSystem(props) {
          // removes theme because the props become css style
          return {...props, theme: undefined}
        },
      ]

    const nextProps = {
      ...restProps,
      // uses theme in the props or uses theme in options
      theme: _theme ?? theme,
    }

    return css(
      ...system.map((value) => {
        if (typeof value === 'function') {
          return value(nextProps)
        }
        return value
      }),
    )
  }

  const getClassName = (binding: DirectiveBinding<any>) => {
    const {value, arg} = binding

    if (typeof value !== 'object' || Array.isArray(value)) {
      return
    }
    return getCss(value, theme, arg)
  }

  const updateClassName = (el: EmotionElement, binding: DirectiveBinding<any>) => {
    const {previousClassName} = el.__emotion__ ?? {}
    if (previousClassName) {
      el.classList.remove(previousClassName)
    }

    const className = getClassName(binding)
    el.__emotion__ = {
      previousClassName: className,
    }

    if (className) {
      el.classList.add(className)
    }
  }

  return {
    getSSRProps(binding) {
      return {
        class: getClassName(binding),
      }
    },
    mounted(el: EmotionElement, binding) {
      updateClassName(el, binding)
    },
    updated(el: EmotionElement, binding) {
      updateClassName(el, binding)
    },
  }
}
