import {isReadonly, ToRef} from 'vue'
// fix type error
// eslint-disable-next-line vue/prefer-import-from-vue
export {type IfAny} from '@vue/shared'

export const isToRef = <T>(value: any): value is ToRef<T> => {
  return Boolean(value?._key)
}

export const isWritableToRef = <T>(value: any): value is ToRef<T> => {
  return !isReadonly(value?._object) && isToRef(value)
}
