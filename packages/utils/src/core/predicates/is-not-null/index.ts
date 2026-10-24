import {isNull} from 'es-toolkit/predicate'
import {NotNull} from 'src/core/types/shared'

/**
 * Type guard function that checks if a value is not null
 * @param value - The value to check
 * @returns True if the value is not null, false otherwise
 */
export const isNotNull = <T>(value: T): value is NotNull<T> => !isNull(value)
