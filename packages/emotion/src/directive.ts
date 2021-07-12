import {Emotion as _Emotion, CSSObject} from '@emotion/css/create-instance'
import {ObjectDirective} from 'vue-demi'

export interface EmotionAddition {
  setSystem: (system?: ((props: any) => CSSObject)) => any
  setTheme: (theme?: any) => any
}

export const createDirective = (emotion: _Emotion): ObjectDirective & EmotionAddition => {

  const {css} = emotion

  let _theme = {}
  // eslint-disable-next-line unicorn/consistent-function-scoping
  let _system: (props: any) => CSSObject = (props) => (props)

  let previousClassName

  const getCss = (props: any, theme, system, arg?: string) => {

    if (arg === 'system') {
      return css(system({...props, theme}))
    }

    return css({...props, theme})
  }

  return {
    beforeUpdate(el, binding) {
      if (previousClassName) {
        el.classList.remove(previousClassName)
      }
      const {value, arg} = binding

      if (typeof value !== 'object' || Array.isArray(value)) {
        return
      }

      const className = getCss(value, _theme, _system, arg)

      el.classList.add(className)
    },
    created(el: Element, binding) {
      const {value, arg} = binding
      if (typeof value !== 'object' || Array.isArray(value)) {
        return
      }

      const className = getCss(value, _theme, _system, arg)

      el.classList.add(className)
    },
    setSystem(system?: any) {
      if (system) {
        _system = system
      }
    },
    setTheme(theme) {
      if (theme) {
        _theme = theme
      }
    },
  }
}
