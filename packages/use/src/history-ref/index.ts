import {watch} from 'vue-demi'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'

export interface HistoryRefOptions {
  max?: number
  sources?: MayRef<any>[]
}

export const historyRef = <Value>(value: MayRef<Value>, options: HistoryRefOptions = {}) => {
  const {sources = [], max = 1} = options
  const valueRef = wrapRef(value)
  const historyRef = wrapRef<Value[]>([])

  watch([valueRef, ...sources], (_, [old]: any) => {
    historyRef.value.splice(-1, historyRef.value.length - max + 1)
    historyRef.value.unshift(old)
  })

  return historyRef
}
