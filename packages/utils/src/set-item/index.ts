import {getItem} from 'src/get-item'

export const setItem = <T, P = any>(target: T | undefined, path: string[], value: P): void => {
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
