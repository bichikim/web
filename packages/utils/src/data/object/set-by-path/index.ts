import {getByPath} from 'src/data/object/get-by-path'

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

export const setByPath = <T, P = any>(
  target: T | undefined,
  path: readonly PropertyKey[],
  value: P,
): void => {
  // Paths may originate outside the process; inherited prototype paths must never be writable.
  if (path.some((segment) => typeof segment === 'string' && UNSAFE_PATH_SEGMENTS.has(segment))) {
    return
  }

  const _path = [...path]
  const targetName = _path.pop()

  if (targetName === undefined) {
    return
  }

  const targetItem = getByPath(target, _path)

  if (typeof targetItem !== 'object' || targetItem === null) {
    return
  }

  Reflect.set(targetItem, targetName, value)
}

/** @deprecated Use `setByPath` instead. */
export const setItem = setByPath
