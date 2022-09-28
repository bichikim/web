import {DirectiveBinding} from 'vue'

export const getDirectiveStoreKey = (binding: DirectiveBinding, name: string = '__stitches__') => {
  const {arg: namespace = ''} = binding
  return `${name}${namespace}`
}
