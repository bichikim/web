import {NotUndefined} from 'src/types'

/**
 * Type guard function that checks if a value is not undefined
 * @param value - The value to check
 * @returns True if the value is not undefined, false otherwise
 * @example
 * ```ts
 * const value: string | undefined = 'hello'
 * if (isNotUndefined(value)) {
 *   // value is string here
 *   console.log(value.toUpperCase())
 * }
 * ```
 */
export const isNotUndefined = <T>(value: T): value is NotUndefined<T> => value !== undefined
