import {wrapRef} from '../wrap-ref'
import {MayRef} from '../types'
import {Ref} from 'vue'

export type ToggleRefReturnType = [() => unknown, Ref<boolean>]

export const toggleRef = (value: MayRef<boolean> = false): ToggleRefReturnType => {
  const valueRef = wrapRef(value)

  const toggle = () => {
    valueRef.value = !valueRef.value
  }

  return [toggle, valueRef]
}
