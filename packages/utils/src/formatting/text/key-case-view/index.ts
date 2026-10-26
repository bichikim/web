import {snakeCase} from 'es-toolkit/string'
import {SnakeToCamelCase} from 'src/core/types/shared'

export type KeyCaseView<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly KeyCaseView<Item>[]
    : T extends object
      ? {readonly [Key in keyof T]: KeyCaseView<T[Key]>}
      : T

interface SourceKeyStrategy {
  /** Preserves source-key types for an arbitrary resolver. */
  readonly kind: 'source'
  /** Resolves requested string keys that are absent from the source. */
  readonly resolveSourceKey: (key: string) => string
}

interface CamelCaseStrategy {
  /** Exposes the fixed snake_case-to-camelCase mapping. */
  readonly kind: 'camel'
}

type KeyCaseStrategy = SourceKeyStrategy | CamelCaseStrategy
type StrategyView<T, S extends KeyCaseStrategy> = S extends CamelCaseStrategy
  ? ToCamelCaseKeys<T>
  : KeyCaseView<T>

const createKeyCaseProxy = <T extends object, S extends KeyCaseStrategy>(
  source: T,
  strategy: S,
): StrategyView<T, S> => {
  const resolveSourceKey = strategy.kind === 'camel' ? snakeCase : strategy.resolveSourceKey
  const cache = new Map<string | symbol, unknown>()

  return new Proxy(source, {
    get(target, prop: string | symbol, receiver) {
      if (cache.has(prop)) {
        return cache.get(prop)
      }

      let value: unknown = Reflect.get(target, prop, receiver)

      const descriptor = Reflect.getOwnPropertyDescriptor(target, prop)

      if (descriptor && !descriptor.configurable && 'value' in descriptor && !descriptor.writable) {
        return value
      }

      if (value === undefined && typeof prop !== 'symbol') {
        value = Reflect.get(target, resolveSourceKey(prop), receiver)
      }

      const viewValue =
        typeof value === 'object' && value !== null ? createKeyCaseProxy(value, strategy) : value

      cache.set(prop, viewValue)

      return viewValue
    },
  }) as unknown as StrategyView<T, S>
}

/**
 * 원본을 복사하지 않고, 요청한 키를 원본 키로 변환해 읽는 지연 Proxy view를 만듭니다.
 * 반환 타입은 재귀적으로 읽기 전용이지만 원본 객체를 런타임 불변으로 만들지는 않습니다.
 * 키 열거, spread, 직렬화에는 원본 키가 그대로 노출됩니다.
 */
export const createKeyCaseView = <T extends object>(
  source: T,
  resolveSourceKey: (key: string) => string,
): KeyCaseView<T> => createKeyCaseProxy(source, {kind: 'source', resolveSourceKey})

type CamelCaseKeys<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? CamelCaseKeys<Item>[]
    : T extends object
      ? {
          [Key in keyof T as Key extends string ? SnakeToCamelCase<Key> : Key]: CamelCaseKeys<
            T[Key]
          >
        }
      : T

export type ToCamelCaseKeys<T> = KeyCaseView<CamelCaseKeys<T>>

/**
 * snake_case 키를 camelCase로 읽는, 복사 없는 읽기 전용 view를 만듭니다.
 */
export const createCamelCaseView = <T extends object>(source: T): ToCamelCaseKeys<T> => {
  return createKeyCaseProxy(source, {kind: 'camel'})
}

/** @deprecated `createKeyCaseView`를 사용하세요. */
export const createKeyCase = createKeyCaseView

/** @deprecated `createCamelCaseView`를 사용하세요. */
export const createSnakeCase = createCamelCaseView
