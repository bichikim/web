import {PureObject} from 'src/core/types/shared'

/**
 * remove keys which has undefined value
 * but don’t make a case to use this
 * @param value
 */
export const omitUndefinedProperties = (value: PureObject): PureObject => {
  const entries = Reflect.ownKeys(value)
    .filter((key) => Object.prototype.propertyIsEnumerable.call(value, key))
    .map((key) => [key, Reflect.get(value, key)] as const)
    .filter(([, item]) => item !== undefined)

  return Object.fromEntries(entries)
}

/** @deprecated Use `omitUndefinedProperties` instead. */
export const cleanObject = omitUndefinedProperties
