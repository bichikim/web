import 'server-only'

import {request as httpsRequest} from 'node:https'

import {z} from 'zod'

import {getTossMtlsCredentials, type TossMtlsCredentials} from './environment'

const TOSS_API_ORIGIN = 'https://apps-in-toss-api.toss.im'
const TOKEN_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/generate-token'
const USER_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/login-me'
const REQUEST_TIMEOUT = 8_000
const MAX_RESPONSE_BYTES = 1_048_576
const HTTP_OK_MINIMUM = 200
const HTTP_REDIRECT_MINIMUM = 300
const HTTP_BAD_GATEWAY = 502

const tossTokenResponseSchema = z.object({
  resultType: z.literal('SUCCESS'),
  success: z.object({accessToken: z.string().min(1)}),
})
const tossUserResponseSchema = z.object({
  resultType: z.literal('SUCCESS'),
  success: z.object({userKey: z.union([z.number().int().nonnegative(), z.string().min(1)])}),
})

interface TossRequest {
  readonly accessToken?: string
  readonly body?: Readonly<Record<string, string>>
  readonly method: 'GET' | 'POST'
  readonly path: string
}

interface TossResponse {
  readonly body: unknown
  readonly status: number
}

export interface TossLoginInput {
  readonly authorizationCode: string
  readonly referrer: 'DEFAULT' | 'SANDBOX'
}

export interface TossLoginIdentity {
  readonly userKey: string
}

type TossRequester = (request: TossRequest) => Promise<TossResponse>

const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('Toss returned an invalid JSON response')
  }
}

const createMtlsRequester =
  (credentials: TossMtlsCredentials): TossRequester =>
  (request) =>
    new Promise((resolve, reject) => {
      const body = request.body === undefined ? undefined : JSON.stringify(request.body)
      const headers: Record<string, string> = {Accept: 'application/json'}

      if (body !== undefined) {
        headers['Content-Length'] = String(Buffer.byteLength(body))
        headers['Content-Type'] = 'application/json'
      }

      if (request.accessToken !== undefined) {
        headers.Authorization = `Bearer ${request.accessToken}`
      }

      const outgoingRequest = httpsRequest(
        new URL(request.path, TOSS_API_ORIGIN),
        {
          cert: credentials.certificate,
          headers,
          key: credentials.privateKey,
          method: request.method,
          rejectUnauthorized: true,
        },
        (response) => {
          const chunks: Buffer[] = []
          let receivedBytes = 0

          response.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length

            if (receivedBytes > MAX_RESPONSE_BYTES) {
              response.destroy(new Error('Toss response exceeded the size limit'))
              return
            }

            chunks.push(chunk)
          })
          response.on('end', () => {
            const responseBody = Buffer.concat(chunks).toString('utf8')
            resolve({
              body: responseBody.length === 0 ? null : parseJson(responseBody),
              status: response.statusCode ?? HTTP_BAD_GATEWAY,
            })
          })
          response.on('error', reject)
        },
      )

      outgoingRequest.setTimeout(REQUEST_TIMEOUT, () => {
        outgoingRequest.destroy(new Error('Toss request timed out'))
      })
      outgoingRequest.on('error', reject)

      if (body !== undefined) {
        outgoingRequest.write(body)
      }

      outgoingRequest.end()
    })

const requireSuccessfulResponse = (response: TossResponse): unknown => {
  if (response.status < HTTP_OK_MINIMUM || response.status >= HTTP_REDIRECT_MINIMUM) {
    throw new Error(`Toss request failed with status ${response.status}`)
  }

  return response.body
}

export const exchangeTossAuthorization = async (
  input: TossLoginInput,
  requester: TossRequester = createMtlsRequester(getTossMtlsCredentials()),
): Promise<TossLoginIdentity> => {
  const tokenResponse = await requester({
    body: {
      authorizationCode: input.authorizationCode,
      referrer: input.referrer,
    },
    method: 'POST',
    path: TOKEN_PATH,
  })
  const token = tossTokenResponseSchema.parse(requireSuccessfulResponse(tokenResponse))
  const userResponse = await requester({
    accessToken: token.success.accessToken,
    method: 'GET',
    path: USER_PATH,
  })
  const user = tossUserResponseSchema.parse(requireSuccessfulResponse(userResponse))

  return {userKey: String(user.success.userKey)}
}
