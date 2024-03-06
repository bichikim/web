export type NoNull<T> = T extends null ? undefined : T

export const toUndefined = <T>(value: any): NoNull<T> => {
  return value ?? undefined
}
