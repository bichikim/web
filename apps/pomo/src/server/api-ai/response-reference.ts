import {regexes} from 'zod/v4/core'

const RESPONSE_PREFIX = 'pomo-api:'

export const createApiAiResponseReference = (jobId: string): string => `${RESPONSE_PREFIX}${jobId}`

/** Returns a durable job ID only for a valid Pomo response handle. */
export const parseApiAiResponseReference = (reference: string): string | null => {
  if (!reference.startsWith(RESPONSE_PREFIX)) {
    return null
  }
  const jobId = reference.slice(RESPONSE_PREFIX.length)
  return regexes.guid.test(jobId) ? jobId : null
}
