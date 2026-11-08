import type {IncomingMessage, ServerResponse} from 'node:http'
import {constants} from 'node:http2'

export const sendJson = (
  response: ServerResponse,
  value: unknown,
  status = constants.HTTP_STATUS_OK,
) => {
  if (response.destroyed || response.writableEnded) {
    return
  }
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json',
  })
  response.end(body)
}

export const readRequest = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  let size = 0
  const MAXIMUM_BYTES = 268_435_456
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.byteLength
    if (size > MAXIMUM_BYTES) {
      throw new Error('request-too-large')
    }
    chunks.push(bytes)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
