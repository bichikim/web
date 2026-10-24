import {Accessor, createMemo} from 'solid-js'
import {resolveAccessor} from 'src/resolve-accessor'
import {MaybeAccessor} from 'src/types'

export interface ToggleValue {
  <T>(value: MaybeAccessor<T>, toggleValue: MaybeAccessor<boolean>): Accessor<T | undefined>
  <T, R>(value: MaybeAccessor<T>, toggleValue: MaybeAccessor<boolean>, offValue: R): Accessor<T | R>
}

export const toggleValue: ToggleValue = <T, R>(
  value: MaybeAccessor<T>,
  toggleValue: MaybeAccessor<boolean>,
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
