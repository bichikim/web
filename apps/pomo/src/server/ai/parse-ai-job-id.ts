import {z} from 'zod'
import {noStoreJson} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
const jobIdSchema = z.uuid()

/** Parses the AI job identifier or returns the existing invalid-request response. */
export const parseAiJobId = (value: unknown): string | Response => {
  const parsed = jobIdSchema.safeParse(value)
  return parsed.success
    ? parsed.data
    : noStoreJson({error: 'invalid_request'}, {status: HTTP_BAD_REQUEST})
}
