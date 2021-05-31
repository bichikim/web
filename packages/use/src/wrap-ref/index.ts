import {ref, Ref, UnwrapRef} from 'vue-demi'
import {MayRef} from 'src/types'

export const wrapRef = <T extends MayRef<any>>(value?: T): Ref<UnwrapRef<T>> => {
  return ref(value) as any
}
