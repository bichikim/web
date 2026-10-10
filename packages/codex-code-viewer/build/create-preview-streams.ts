import {randomUUID} from 'node:crypto'
import type {ServerResponse} from 'node:http'
import {pipeline} from 'node:stream/promises'

async function* readBody(body: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const reader = body.getReader()
  try {
    while (true) {
      // oxlint-disable-next-line no-await-in-loop -- Stream each chunk before requesting the next.
      const chunk = await reader.read()
      if (chunk.done) {
        return
      }
      yield chunk.value
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

/** Proxies registered loopback streams through the token-protected preview origin. */
export const createPreviewStreams = (base: string) => {
  const streams = new Map<string, string>()
  const expose = (endpoint: unknown, origin: string): string | null => {
    if (typeof endpoint !== 'string' || !URL.canParse(endpoint)) {
      return null
    }
    const url = new URL(endpoint)
    if (
      url.protocol !== 'http:' ||
      url.hostname !== '127.0.0.1' ||
      url.username !== '' ||
      url.password !== ''
    ) {
      return null
    }
    const route = `stream/${randomUUID()}`
    streams.set(route, endpoint)
    return new URL(`${base}${route}`, origin).href
  }
  const forward = async (route: string, response: ServerResponse): Promise<void> => {
    const upstream = streams.get(route)
    if (upstream === undefined) {
      const notFound = 404
      response.writeHead(notFound).end()
      return
    }
    const controller = new AbortController()
    response.once('close', () => controller.abort())
    try {
      const result = await fetch(upstream, {signal: controller.signal})
      response.writeHead(result.status, {
        'Cache-Control': 'no-store',
        'Content-Type': result.headers.get('content-type') ?? 'application/octet-stream',
      })
      if (result.body === null) {
        response.end()
      } else {
        await pipeline(readBody(result.body), response)
      }
    } finally {
      if (new URL(upstream).pathname.startsWith('/scan/')) {
        streams.delete(route)
      }
    }
  }
  return {expose, forward}
}
