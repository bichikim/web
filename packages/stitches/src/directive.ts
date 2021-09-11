
import {DirectiveBinding, ObjectDirective} from 'vue-demi'
import Stitches from '@stitches/core/types/stitches'

// export interface StitchesAdditionalOptions {
// }

export interface StitchesInfo {
  previousClassNames?: string[]
}

export interface CreateDirectiveOptions {
  systems?: Record<string, (props: any) => unknown>
  theme?: Record<string, any>
}

export type EmotionElement = Element & {
  __stitches__?: StitchesInfo
}

export const createDirective = <S extends Stitches>(stitches: S, ...systems: Parameters<S['css']>): ObjectDirective => {
  const {css} = stitches

  const system = css(...systems as any)

  const getClassName = (binding: DirectiveBinding<any>) => {
    const {value} = binding

    if (typeof value !== 'object' || Array.isArray(value)) {
      return
    }
    return system({css: value}).className.split(' ')
  }

  const updateClassName = (el: EmotionElement, binding: DirectiveBinding<any>) => {
    const {previousClassNames} = el.__stitches__ ?? {}
    if (previousClassNames) {
      el.classList.remove(...previousClassNames)
    }

    const classNames = getClassName(binding)

    el.__stitches__ = {
      previousClassNames: classNames,
    }

    if (classNames) {
      el.classList.add(...classNames)
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
