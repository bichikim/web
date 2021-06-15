import {ref, Ref, UnwrapRef} from 'vue'
import {MayRef} from 'src/types'

export const wrapRef = <T extends MayRef<any>>(value?: T): Ref<UnwrapRef<T>> => {
  return ref(value) as any
}
