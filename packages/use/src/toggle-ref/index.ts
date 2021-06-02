import {wrapRef} from '../wrap-ref'
import {MayRef} from '../types'

export const toggleRef = (value: MayRef<boolean> = false) => {
  const valueRef = wrapRef(value)

  const toggle = () => {
    valueRef.value = !valueRef.value
  }

  return [valueRef, toggle]
}
