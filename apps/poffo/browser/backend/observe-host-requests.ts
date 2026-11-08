import {createServer, request as forwardRequest} from 'node:http'
import {constants} from 'node:http2'
import {once} from 'node:events'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import type {HostConnection} from '../../src/backend/node/start-node-host'

interface ObserveHostOptions {
  /** The test-owned host whose public HTTP traffic is observed. */
  readonly connection: HostConnection
  /** Isolated workspace containing this host's private descriptor. */
  readonly workspace: string
  /** Destination for timing metadata, excluding headers and document content. */
  readonly path: string
}

/** Forwards test traffic without changing the installed application or retaining capabilities. */
export const observeHostRequests = async (options: ObserveHostOptions) => {
  const {connection, workspace, path} = options
  const descriptor = join(workspace, '.poffo/connection.json')
  const original = await readFile(descriptor, 'utf8')
  await mkdir(dirname(path), {recursive: true})
  const records: object[] = []
  let writes = Promise.resolve()
  let identifier = 0
  let url = ''
  const record = (value: object) => {
    records.push({at: new Date().toISOString(), ...value})
    writes = writes.then(() => writeFile(path, JSON.stringify(records, null, 2)))
  }
  const proxy = createServer((request, response) => {
    const target = new URL(request.url ?? '/', connection.url)
    identifier += 1
    const id = identifier
    const started = Date.now()
    const upstream = forwardRequest(target, {
      headers: {
        ...request.headers,
        host: target.host,
        ...(request.headers.origin === url ? {origin: connection.url} : {}),
      },
      method: request.method,
    })
    const chunks: Buffer[] = []
    let size = 0
    const METADATA_LIMIT = 4096
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size <= METADATA_LIMIT) {
        chunks.push(chunk)
      }
    })
    request.once('end', () => {
      let operation: string | undefined
      if (
        target.pathname === '/api/command' &&
        request.method === 'POST' &&
        size <= METADATA_LIMIT
      ) {
        try {
          const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          if (
            typeof body === 'object' &&
            body !== null &&
            'operation' in body &&
            typeof body.operation === 'string'
          ) {
            operation = body.operation
          }
        } catch {
          // The application owns malformed input handling; observation must not replace it.
        }
      }
      record({id, method: request.method, operation, path: target.pathname, phase: 'request', size})
    })
    upstream.once('response', (incoming) => {
      record({elapsed: Date.now() - started, id, phase: 'headers', status: incoming.statusCode})
      response.writeHead(incoming.statusCode ?? constants.HTTP_STATUS_BAD_GATEWAY, incoming.headers)
      incoming.pipe(response)
    })
    upstream.once('error', (error) => {
      record({elapsed: Date.now() - started, error: error.message, id, phase: 'upstream-error'})
      response.destroy(error)
    })
    response.once('close', () => {
      record({
        elapsed: Date.now() - started,
        finished: response.writableFinished,
        id,
        phase: 'closed',
      })
      upstream.destroy()
    })
    request.pipe(upstream)
  })
  proxy.listen(0, '127.0.0.1')
  await once(proxy, 'listening')
  const address = proxy.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Observation proxy did not bind')
  }
  url = `http://127.0.0.1:${address.port}`
  await writeFile(descriptor, JSON.stringify({...connection, url}))
  return {
    close: async () => {
      proxy.closeAllConnections()
      await new Promise<void>((resolve, reject) => {
        proxy.close((error) => (error === undefined ? resolve() : reject(error)))
      })
      await writes
    },
    connection: {...connection, url},
    restore: async () => {
      const stored: unknown = JSON.parse(await readFile(descriptor, 'utf8'))
      if (
        typeof stored !== 'object' ||
        stored === null ||
        !('sessionId' in stored) ||
        stored.sessionId !== connection.sessionId
      ) {
        throw new Error('Observed host descriptor changed ownership')
      }
      await writeFile(descriptor, original)
    },
  }
}
