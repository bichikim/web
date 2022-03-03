import {stringifyJson} from './safe-json'
import {patchSafeString} from './patch-safe-string'
import {MaybeRef} from './types'
import {unref} from 'vue'

export const serialize = (value: any): string => {
  return patchSafeString(stringifyJson(value))
}

export const refSerialize = <T>(value: MaybeRef<T>): string => {
  return serialize(unref(value))
}
