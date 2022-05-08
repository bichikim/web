import {readonly, watch} from 'vue-demi'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'

/**
 * deprecated
 * @deprecated
 * @param value
 * @param max
 * @param sources
 */
export const historyRef = <Value>(
  value: MayRef<Value>,
  max: MayRef<number> = 1,
  // todo fix this
  // eslint-disable-next-line functional/prefer-readonly-type
  sources: MayRef<any>[] = []) => {
  const valueRef = wrapRef(value)
  const maxRef = wrapRef(max)
  // todo fix this
  // eslint-disable-next-line functional/prefer-readonly-type
  const historyRef = wrapRef<Value[]>([])

  watch(maxRef, () => {
    historyRef.value.splice(-1, historyRef.value.length - maxRef.value + 1)
  })

  watch([valueRef, ...sources], (_, [old]: any) => {
    historyRef.value.splice(-1, historyRef.value.length - maxRef.value + 1)
    historyRef.value.unshift(old)
  })

  return readonly(historyRef)
}
