const RESPONSE_PREFIX = 'pomo-api:'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

export const createApiAiResponseReference = (jobId: string): string => `${RESPONSE_PREFIX}${jobId}`

/** Returns a durable job ID only for a valid Pomo response handle. */
export const parseApiAiResponseReference = (reference: string): string | null => {
  if (!reference.startsWith(RESPONSE_PREFIX)) {
    return null
  }
  const jobId = reference.slice(RESPONSE_PREFIX.length)
  return UUID_PATTERN.test(jobId) ? jobId : null
}
