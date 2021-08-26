import {Emotion as _Emotion, CSSObject} from '@emotion/css/create-instance'
import {DirectiveBinding, ObjectDirective} from 'vue-demi'

export interface EmotionAddition {
  setSystem: (system?: ((props: any) => CSSObject)) => any
  setTheme: (theme?: any) => any
}

export interface EmotionInfo {
  previousClassName
}

export type EmotionElement = Element & {
  __emotion__?: EmotionInfo
}

export interface CreateDirectiveOptions {
  systems?: Record<string, (props: any) => CSSObject>
  theme?: Record<string, any>
}

export const createDirective = (emotion: _Emotion, options: CreateDirectiveOptions = {}):
  ObjectDirective => {

  const {css} = emotion
  const {theme = {}, systems = (props: any) => props} = options

  const getCss = (props: any, theme, systemName: string = 'default') => {

    const system = systems[systemName] ?? function defaultSystem(props) {
      return {...props, theme: undefined}
    }

    return css(system({...props, theme}))
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
