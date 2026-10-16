import {errorSchema} from '../shared/contracts'

/** Identifies a structured missing-file response without treating other read failures as deletion. */
export const isMissingDocument = (error: unknown): boolean => {
  const parsed = errorSchema.safeParse(error instanceof Error ? error.cause : error)
  return parsed.success && parsed.data.code === 'not-found'
}
