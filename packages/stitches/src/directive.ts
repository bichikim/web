
import {DirectiveBinding, ObjectDirective} from 'vue-demi'
import Stitches from '@stitches/core/types/stitches'
import {CssComponent} from '@stitches/core/types/styled-component'

export interface StitchesInfo {
  previousClassNames?: string[]
}

export type DirectiveBindingValue = 
  Record<string, any> |
  [Record<string, any>] |
  [Record<string, any>, Record<string, any>]

export interface CreateDirectiveOptions {
  systems?: Record<string, (props: any) => unknown>
  theme?: Record<string, any>
}

export type StitchesElement = Element & {
  __stitches__?: StitchesInfo
}


export const getCssList = (
  system: CssComponent,
  css: Record<string, any>,
  variants: Record<string, any> = {},
) => {
  return system({...variants, css}).className.split(' ')
}

export const getClassName = (
  system: CssComponent,
  binding: DirectiveBinding<any>,
) => {
  const {value} = binding

  if (typeof value !== 'object') {
    return
  }

  if (Array.isArray(value)) {
    const [css, variants] = value
    return getCssList(system, css, variants)
  }

  return getCssList(system, value)
}

const updateClassName = (
  system: CssComponent,
  el: StitchesElement,
  binding: DirectiveBinding<DirectiveBindingValue>,
) => {
  const {previousClassNames} = el.__stitches__ ?? {}
  if (previousClassNames) {
    el.classList.remove(...previousClassNames)
  }

  const classNames = getClassName(system, binding)

  el.__stitches__ = {
    previousClassNames: classNames,
  }

  if (classNames) {
    el.classList.add(...classNames)
  }
}

export const createDirective = <S extends Stitches>(
  stitches: S,
  ...systems: Parameters<S['css']>
): ObjectDirective<StitchesElement, DirectiveBindingValue> => {
  const {css} = stitches

  const system = css(...systems as any)

  return {
    getSSRProps(binding) {
      return {
        class: getClassName(system, binding),
      }
    },
    mounted(el: StitchesElement, binding) {
      updateClassName(system, el, binding)
    },
    updated(el: StitchesElement, binding) {
      updateClassName(system, el, binding)
    },
  }
}
