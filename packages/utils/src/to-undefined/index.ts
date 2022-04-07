
export type NoNull<T> = T extends null ? undefined : T
export const toUndefined = <T>(value): NoNull<T> => {
  return value === null ? undefined : value
}
