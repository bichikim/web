import {constants} from 'node:http2'
import {createReadStream} from 'node:fs'
import {stat} from 'node:fs/promises'
import {extname, resolve, sep} from 'node:path'
import type {IncomingMessage, ServerResponse} from 'node:http'

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
}

export const serveStatic = async (
  root: string,
  request: IncomingMessage,
  response: ServerResponse,
) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  const candidate = resolve(root, `.${pathname}`)
  if (
    (candidate !== resolve(root) && !candidate.startsWith(`${resolve(root)}${sep}`)) ||
    pathname.startsWith('/cli/')
  ) {
    response.writeHead(constants.HTTP_STATUS_NOT_FOUND).end()
    return
  }
  const metadata = await stat(candidate).catch(() => undefined)
  const path = metadata?.isFile() === true ? candidate : resolve(root, 'index.html')
  response.setHeader('Content-Type', MIME_TYPES[extname(path)] ?? 'application/octet-stream')
  const stream = createReadStream(path)
  stream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(constants.HTTP_STATUS_NOT_FOUND)
    }
    response.end()
  })
  stream.pipe(response)
}
