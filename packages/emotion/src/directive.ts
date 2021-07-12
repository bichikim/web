import {Emotion as _Emotion} from '@emotion/css/create-instance'
import {Directive} from 'vue-demi'

export const createDirective = (emotion: _Emotion & {theme?: any}): Directive => {

  const {css} = emotion

  let previousClassName

  return {
    beforeUpdate(el, binding) {
      if (previousClassName) {
        el.classList.remove(previousClassName)
      }
      const {value} = binding

      if (typeof value !== 'object' || Array.isArray(value)) {
        return
      }

      const className = css(value)

      el.classList.add(className)
    },
    created(el: Element, binding) {
      const {value} = binding
      if (typeof value !== 'object' || Array.isArray(value)) {
        return
      }

      const className = css(value)

      el.classList.add(className)
    },
  }
}
