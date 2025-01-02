import {MaybeRef} from 'src/types'
import {getRef} from '../unref'
import {isWritableRef} from 'src/checks/is-writable-ref'

export const setRef = <T>(_value: MaybeRef<T>, newValue: MaybeRef<T>): void => {
  const _newValue = getRef(newValue)

  if (isWritableRef(_value)) {
    _value.value = _newValue
  }
}
