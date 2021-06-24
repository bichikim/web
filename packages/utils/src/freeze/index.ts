/**
 * Optimized freeze
 * @param record
 */
export function freeze<T>(record: T[]): readonly T[]
export function freeze<T>(record: T): Readonly<T>
export function freeze(record: any) {
  if (process.env.NODE_ENV === 'development') {
    return Object.freeze(record)
  }

  return record
}
