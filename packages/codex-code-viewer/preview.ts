import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http'
import {resolve} from 'node:path'
import {networkInterfaces} from 'node:os'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {CallToolRequestSchema, CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {createPreviewStreams} from './build/create-preview-streams'
import manifest from './package.json' with {type: 'json'}

const [, , path] = process.argv
if (path === undefined) {
  throw new Error('Usage: node --import tsx preview.ts /absolute/path/to/file.tsx')
}
const status = {
  badRequest: 400,
  failure: 500,
  forbidden: 403,
  notFound: 404,
  ok: 200,
  tooLarge: 413,
}
const host = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1'
const anchor = resolve(path)
const client = new Client({name: 'Code Viewer Preview', version: manifest.version})
const transport = new StdioClientTransport({
  args: [new URL('./dist/server.js', import.meta.url).pathname],
  command: process.execPath,
  env: Object.fromEntries(
    ['GEM_HOME', 'GEM_PATH', 'RUBY_BINARY', 'SOLARGRAPH_BINARY'].flatMap((name) => {
      const value = process.env[name]
      return value === undefined ? [] : [[name, value]]
    }),
  ),
  stderr: 'inherit',
})
await client.connect(transport)
const token = randomUUID()
const base = `/${token}/`
const streams = createPreviewStreams(base)
const allowed = new Set([
  'code.open',
  'code.attach',
  'code.read',
  'code.write',
  'code.create',
  'code.entry',
  'code.transfer',
  'code.remove',
  'code.rename',
  'code.navigate',
  'code.list',
  'code.tree',
  'code.watch',
  'code.close',
  'code.media',
])
const serveTool = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const chunks: Buffer[] = []
  const maximumBytes = 8388608
  let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > maximumBytes) {
      response.writeHead(status.tooLarge).end()
      return
    }
    chunks.push(buffer)
  }
  const input = CallToolRequestSchema.parse({
    method: 'tools/call',
    params: JSON.parse(Buffer.concat(chunks).toString('utf8')),
  })
  if (!allowed.has(input.params.name)) {
    response.writeHead(status.forbidden).end()
    return
  }
  const result = CallToolResultSchema.parse(
    await client.callTool({
      ...input.params,
      _meta: {'openai/resource': {path: anchor}},
    }),
  )
  const endpoint = streams.expose(result.structuredContent?.url, `http://${request.headers.host}`)
  const content =
    endpoint === null ? result.structuredContent : {...result.structuredContent, url: endpoint}
  response
    .writeHead(status.ok, {'Content-Type': 'application/json'})
    .end(JSON.stringify({...result, structuredContent: content}))
}
const reportFailure = (error: unknown, response: ServerResponse): void => {
  if (response.destroyed) {
    return
  }
  console.error(error)
  if (!response.headersSent) {
    response.writeHead(status.failure)
  }
  response.end('Code Viewer preview request failed.')
}
const server = createServer(async (request, response) => {
  const route = request.url?.slice(base.length)
  const origin = request.headers['sec-fetch-site']
  if (!request.url?.startsWith(base) || origin === 'cross-site') {
    response.writeHead(status.notFound).end()
    return
  }
  try {
    if (request.method === 'GET' && route?.startsWith('stream/')) {
      await streams.forward(route, response)
      return
    }
    if (request.method === 'POST' && route === 'tool') {
      await serveTool(request, response)
      return
    }
    if (request.method === 'GET' && route === 'initial') {
      if (process.argv.includes('--panel')) {
        const result = await client.callTool({
          _meta: process.argv.includes('--empty') ? undefined : {'openai/resource': {path: anchor}},
          arguments: {},
          name: 'code.panel',
        })
        response
          .writeHead(status.ok, {'Content-Type': 'application/json'})
          .end(JSON.stringify(result))
        return
      }
      const result = await client.callTool({
        arguments: {file: {name: anchor.split('/').at(-1), resourceUri: 'host-resource://preview'}},
        name: 'code.file',
      })
      response
        .writeHead(status.ok, {'Content-Type': 'application/json'})
        .end(JSON.stringify(result))
      return
    }
    if (request.method === 'GET' && (route === '' || route === 'app')) {
      const file = route === 'app' ? './dist/app.html' : './dist/preview.html'
      const html = await readFile(new URL(file, import.meta.url), 'utf8')
      response
        .writeHead(status.ok, {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/html; charset=utf-8',
        })
        .end(html)
      return
    }
    response.writeHead(status.notFound).end()
  } catch (error) {
    reportFailure(error, response)
  }
})
server.listen(0, host, () => {
  const address = server.address()
  if (address !== null && typeof address !== 'string') {
    console.log(`Code Viewer preview: http://127.0.0.1:${address.port}${base}`)
    if (host === '0.0.0.0') {
      for (const network of Object.values(networkInterfaces()).flat()) {
        if (network?.family === 'IPv4' && !network.internal) {
          console.log(`Network preview: http://${network.address}:${address.port}${base}`)
        }
      }
    }
  }
})
const close = async (): Promise<void> => {
  server.close()
  await client.close()
}
process.once('SIGINT', close)
process.once('SIGTERM', close)
