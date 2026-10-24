// oxlint-disable no-magic-numbers -- HTTP status codes and the request body limit are protocol values.
// oxlint-disable no-void -- Request handlers and queue pumps intentionally run asynchronously.
// oxlint-disable max-statements -- The handler keeps the small versioned runner API in one routing boundary.
// oxlint-disable eslint-js/prefer-named-capture-group -- The route expression has one intentionally positional segment.

import {timingSafeEqual} from 'node:crypto'
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http'

import {aiRunnerJobRequestSchema, aiRunnerSubmitResponseSchema} from '../ai/runner-contract.ts'
import {RunnerRequestConflictError} from './errors.ts'
import type {RunnerService} from './types.ts'

interface CreateRunnerHttpServerOptions {
  readonly maxBodyBytes?: number
  readonly service: RunnerService
  readonly token: string
}

const DEFAULT_MAX_BODY_BYTES = 16 * 1024 * 1024
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8'

class BodyTooLargeError extends Error {
  constructor() {
    super('The runner request body is too large')
    this.name = 'BodyTooLargeError'
  }
}

const writeJson = (response: ServerResponse, status: number, value: unknown): void => {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': JSON_CONTENT_TYPE,
  })
  response.end(body)
}

const getBearerToken = (request: IncomingMessage): string | null => {
  const header = request.headers.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null
  }

  const token = header.slice('Bearer '.length)
  return token.length === 0 ? null : token
}

const isTokenEqual = (provided: string | null, expected: string): boolean => {
  if (provided === null) {
    return false
  }

  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  return (
    providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
  )
}

const readBody = async (request: IncomingMessage, maximumBytes: number): Promise<string> => {
  const chunks: Buffer[] = []
  let length = 0

  // oxlint-disable-next-line no-await-in-loop -- IncomingMessage exposes the body as an ordered stream.
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += buffer.byteLength
    if (length > maximumBytes) {
      throw new BodyTooLargeError()
    }
    chunks.push(buffer)
  }

  return Buffer.concat(chunks).toString('utf8')
}

const getJobId = (pathname: string): string | null => {
  const match = /^\/v1\/jobs\/(?<jobId>[^/]+)(?:\/cancel)?$/u.exec(pathname)
  if (match === null || match.groups?.jobId === undefined) {
    return null
  }

  try {
    return decodeURIComponent(match.groups?.jobId ?? '')
  } catch {
    return null
  }
}

const submitRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  options: CreateRunnerHttpServerOptions,
): Promise<void> => {
  const maximumBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  let body: string
  try {
    body = await readBody(request, maximumBytes)
  } catch (error: unknown) {
    if (error instanceof BodyTooLargeError) {
      writeJson(response, 413, {error: {code: 'body-too-large', message: error.message}})
      return
    }
    throw error
  }

  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    writeJson(response, 400, {
      error: {code: 'invalid-request', message: 'Valid JSON is required'},
    })
    return
  }

  const parsed = aiRunnerJobRequestSchema.safeParse(value)
  if (!parsed.success) {
    writeJson(response, 400, {
      error: {code: 'invalid-request', message: 'Invalid runner request'},
    })
    return
  }

  try {
    const submitted = options.service.submit(parsed.data)
    const payload = aiRunnerSubmitResponseSchema.parse({jobId: submitted.jobId})
    writeJson(response, submitted.created ? 201 : 200, payload)
  } catch (error: unknown) {
    if (error instanceof RunnerRequestConflictError) {
      writeJson(response, 409, {error: {code: error.code, message: error.message}})
      return
    }
    throw error
  }
}

const handleAuthenticatedRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  options: CreateRunnerHttpServerOptions,
): Promise<void> => {
  const url = new URL(request.url ?? '/', 'http://runner.local')

  if (request.method === 'GET' && url.pathname === '/v1/health') {
    writeJson(response, 200, {protocolVersion: 1, status: 'ok'})
    return
  }

  if (request.method === 'POST' && url.pathname === '/v1/jobs') {
    await submitRequest(request, response, options)
    return
  }

  const jobId = getJobId(url.pathname)
  if (jobId === null) {
    writeJson(response, 404, {error: {code: 'not-found', message: 'Runner route not found'}})
    return
  }

  if (request.method === 'GET' && url.pathname.endsWith(`/jobs/${encodeURIComponent(jobId)}`)) {
    const status = options.service.getStatus(jobId)
    if (status === null) {
      writeJson(response, 404, {error: {code: 'not-found', message: 'Runner job not found'}})
      return
    }
    writeJson(response, 200, status)
    return
  }

  if (
    request.method === 'POST' &&
    url.pathname.endsWith(`/jobs/${encodeURIComponent(jobId)}/cancel`)
  ) {
    const status = options.service.cancel(jobId)
    if (status === null) {
      writeJson(response, 404, {error: {code: 'not-found', message: 'Runner job not found'}})
      return
    }
    writeJson(response, 202, status)
    return
  }

  writeJson(response, 404, {error: {code: 'not-found', message: 'Runner route not found'}})
}

const handleRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  options: CreateRunnerHttpServerOptions,
): Promise<void> => {
  if (!isTokenEqual(getBearerToken(request), options.token)) {
    writeJson(response, 401, {
      error: {code: 'unauthorized', message: 'Bearer authentication required'},
    })
    return
  }

  await handleAuthenticatedRequest(request, response, options)
}

export const createRunnerHttpServer = (options: CreateRunnerHttpServerOptions): Server =>
  createServer((request, response) => {
    void handleRequest(request, response, options).catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined)
      } else {
        writeJson(response, 500, {
          error: {
            code: 'internal-error',
            message: error instanceof Error ? error.message : 'Runner request failed',
          },
        })
      }
    })
  })
