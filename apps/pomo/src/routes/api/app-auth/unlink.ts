import {createHash, timingSafeEqual} from 'node:crypto'

import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {readJsonBody} from 'src/server/http/body'
import {noStoreEmpty, noStoreText} from 'src/server/http/response'
import {env} from 'src/env'
import {revokeTossAppSessions} from 'src/server/user-auth/repository'

const MAXIMUM_BODY_SIZE = 4096
const MAXIMUM_USER_KEY_LENGTH = 255
const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const unlinkRequestSchema = z.object({
  referrer: z.enum(['UNLINK', 'WITHDRAWAL_TERMS', 'WITHDRAWAL_TOSS']),
  userKey: z.union([
    z.number().int().nonnegative().transform(String),
    z.string().trim().min(1).max(MAXIMUM_USER_KEY_LENGTH),
  ]),
})

const hasValidAuthorization = (request: Request): boolean => {
  const actual = request.headers.get('Authorization')
  const expected = env.POMO_TOSS_CALLBACK_AUTHORIZATION

  if (actual === null || expected === undefined) {
    return false
  }

  const expectedDigest = createHash('sha256').update(expected).digest()
  const actualDigest = createHash('sha256').update(actual).digest()

  return timingSafeEqual(actualDigest, expectedDigest)
}

const handleAuthorizedUnlink = async (body: unknown): Promise<Response> => {
  const parsedRequest = unlinkRequestSchema.safeParse(body)

  if (!parsedRequest.success) {
    return noStoreText('Invalid unlink request', {status: HTTP_BAD_REQUEST})
  }

  await revokeTossAppSessions(parsedRequest.data.userKey)
  return noStoreEmpty()
}

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!hasValidAuthorization(event.request)) {
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  const url = new URL(event.request.url)

  return handleAuthorizedUnlink({
    referrer: url.searchParams.get('referrer'),
    userKey: url.searchParams.get('userKey'),
  })
}

export const POST = async (event: APIEvent): Promise<Response> => {
  if (!hasValidAuthorization(event.request)) {
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)

  if (!bodyResult.success) {
    return noStoreText('Invalid unlink request', {status: bodyResult.status})
  }

  return handleAuthorizedUnlink(bodyResult.body)
}
