import type {TextGenerationError} from './execution'

export const createGenerationFailure = (error: TextGenerationError, fallback: string): Error =>
  new Error(error.detail ?? fallback)
