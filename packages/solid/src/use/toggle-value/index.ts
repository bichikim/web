import {Accessor, createMemo} from 'solid-js'
import {resolveAccessor} from 'src/use/resolve-accessor'
import {MayBeAccessor} from 'src/use/types'

export interface ToggleValue {
  <T>(value: MayBeAccessor<T>, toggleValue: MayBeAccessor<boolean>): Accessor<
    T | undefined
  >
  <T, R>(
    value: MayBeAccessor<T>,
    toggleValue: MayBeAccessor<boolean>,
    offValue: R,
  ): Accessor<T | R>
}

export const toggleValue: ToggleValue = <T, R>(
  value: MayBeAccessor<T>,
  toggleValue: MayBeAccessor<boolean>,
  offValue?: R,
) => {
  const valueAccessor = resolveAccessor(value)
  const toggleValueAccessor = resolveAccessor(toggleValue)
  return createMemo(() => {
    const value = valueAccessor()
    const toggleValue = toggleValueAccessor()

    return toggleValue ? value : offValue
  })
}
