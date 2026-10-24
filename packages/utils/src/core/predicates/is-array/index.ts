export type ArrayType<T> = T extends Array<infer U> ? U[] : never

export const isArray = <T>(value: any): value is ArrayType<T> => {
  return Array.isArray(value)
}
