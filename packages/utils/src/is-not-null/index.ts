import {NotNull} from 'src/types'

/**
 * Type guard function that checks if a value is not null
 * @param value - The value to check
 * @returns True if the value is not null, false otherwise
 */
export const isNotNull = <T>(value: T): value is NotNull<T> => value !== null
