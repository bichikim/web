import {ToRef} from 'vue'
// fix tsup build type error
// eslint-disable-next-line vue/prefer-import-from-vue
export {type IfAny} from '@vue/shared'
export const isToRef = <T>(value: any): value is ToRef<T> => {
  return Boolean(value?._key)
}
