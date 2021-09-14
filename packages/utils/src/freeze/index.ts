/**
 * Optimized freeze
 * @param record
 */
export function freeze<T>(record: T[]): readonly T[]
export function freeze<T>(record: T): Readonly<T>
export function freeze(record: any) {
  /* istanbul ignore next */
  if (process.env.NODE_ENV === 'development') {
    return Object.freeze(record)
  }

  // in production no need to use freeze
  /* istanbul ignore next */
  return record
}
