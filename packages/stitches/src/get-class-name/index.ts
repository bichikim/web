import {CssComponent} from '@stitches/core/types/styled-component'
import {DirectiveBinding} from 'vue'

export const getClassName = (system: CssComponent, binding: DirectiveBinding): string | void => {
  const {value, arg} = binding

  if (typeof value !== 'object') {
    return
  }

  if (arg === 'css') {
    return system({css: value}).className
  }

  return system(value).className
}
