import {DeepReadonly, UnwrapNestedRefs} from '@vue/reactivity'
import {readonly} from 'vue-demi'
import {AnyObject} from '@winter-love/utils'

export type AnyDeepReadonly<T> = T extends AnyObject ? DeepReadonly<UnwrapNestedRefs<T>> : T

export const readonlyRef = <T>(target?: T): AnyDeepReadonly<T> => {
  if (typeof target === 'object') {
    return readonly(target as any)
  }
  return target as any
}
