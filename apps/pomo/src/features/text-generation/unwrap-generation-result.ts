import type {Result} from 'src/features/result'
import type {TextGenerationError} from './execution'
import {createGenerationFailure} from './create-generation-failure'

/** Returns a generation value or throws the worker-facing failure message. */
export const unwrapGenerationResult = <Value>(
  result: Result<Value, TextGenerationError>,
  fallback: string,
): Value => {
  if (!result.ok) {
    throw createGenerationFailure(result.error, fallback)
  }
  return result.value
}
