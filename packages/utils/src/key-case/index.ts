import {snakeCase} from 'es-toolkit/string'
import {SnakeToCamelCase} from 'src/types'

export const createKeyCase = <T extends Record<string, any>, R extends Record<string, any>>(
  value: T,
  changeKeyCase: (key: string) => string,
): R => {
  if (typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      return createKeyCase(item, changeKeyCase)
    }) as any
  }

  const cache = new Map<string | symbol, any>()

  return new Proxy(value, {
    get(target, prop: string | symbol, receiver) {
      if (prop === Symbol.toStringTag) {
        return 'Key Match Proxy'
      }

      const cacheValue = cache.get(prop)

      if (cacheValue !== undefined) {
        return cacheValue
      }

      let value = Reflect.get(target, prop, receiver)

      // noinspection SuspiciousTypeOfGuard
      if (value === undefined && typeof prop !== 'symbol') {
        const searchKey = changeKeyCase(prop)

        value = Reflect.get(target, searchKey, receiver)
      }

      const newValue = createKeyCase(value as any, changeKeyCase)

      cache.set(prop, newValue)

      return newValue
    },
  }) as unknown as R
}

export type ToCamelCaseKeys<T> = {
  [P in keyof T as SnakeToCamelCase<P & string>]: ToCamelCaseKeys<T[P]>
}

export const createSnakeCase = <T extends Record<string, any>>(
  value: T,
): {
  [P in keyof T as SnakeToCamelCase<P & string>]: ToCamelCaseKeys<T[P]>
} => {
  return createKeyCase(value, snakeCase)
}
