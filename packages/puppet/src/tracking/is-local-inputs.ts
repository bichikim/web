import {isLocalInput} from './local-inputs'
import type {LocalInput} from './types'
export const isLocalInputs = (value: unknown): value is Readonly<Record<LocalInput, number>> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([id, item]) =>
        isLocalInput(id) &&
        typeof item === 'number' &&
        Number.isFinite(item) &&
        item >= 0 &&
        item <= 1,
    )
  )
}
