export type NullToUndefined<T> = T extends null ? undefined : T

/**
 * 값이 undefined 이거나 null 이면 undefined 를 반환합니다.
 * @param value - 값
 * @returns not null T
 */
export const toNotNull = <T>(value: any): NullToUndefined<T> => {
  return value ?? undefined
}

/**
 * @deprecated use `toNotNull` instead
 */
export const toUndefined = toNotNull
