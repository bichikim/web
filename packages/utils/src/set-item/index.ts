import {getItem} from 'src/get-item'
import {PureObject} from 'src/types'

export const setItem = <T extends PureObject, P = any>(
  target: T | undefined,
  path: string[],
  value: P,
): void => {
  const _path = [...path]
  const targetName = _path.pop()
  if (!targetName) {
    return
  }
  const targetItem = getItem(target, _path)
  if (typeof targetItem !== 'object') {
    return
  }
  Reflect.set(targetItem, targetName, value)
}
