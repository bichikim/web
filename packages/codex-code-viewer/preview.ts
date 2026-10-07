import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {resolve} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js'
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
const anchor = resolve(path)
const client = new Client({name: 'Code Viewer Preview', version: manifest.version})
const transport = new StdioClientTransport({
  args: [new URL('./dist/server.js', import.meta.url).pathname],
  command: process.execPath,
  stderr: 'inherit',
})
await client.connect(transport)
const token = randomUUID()
const base = `/${token}/`
const allowed = new Set([
  'code.open',
  'code.attach',
  'code.read',
  'code.navigate',
  'code.list',
  'code.tree',
  'code.close',
  'code.media',
])
const server = createServer(async (request, response) => {
  const route = request.url?.slice(base.length)
  const origin = request.headers['sec-fetch-site']
  if (!request.url?.startsWith(base) || origin === 'cross-site') {
    response.writeHead(status.notFound).end()
    return
  }
  try {
    if (request.method === 'POST' && route === 'tool') {
      const chunks: Buffer[] = []
      const maximumBytes = 65536
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
      const result = await client.callTool({
        ...input.params,
        _meta: {'openai/resource': {path: anchor}},
      })
      response
        .writeHead(status.ok, {'Content-Type': 'application/json'})
        .end(JSON.stringify(result))
      return
    }
    if (request.method === 'GET' && route === 'initial') {
      if (process.argv.includes('--panel')) {
        const result = await client.callTool({arguments: {}, name: 'code.panel'})
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
    console.error(error)
    response.writeHead(status.failure).end('Code Viewer preview request failed.')
  }
})
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (address !== null && typeof address !== 'string') {
    console.log(`Code Viewer preview: http://127.0.0.1:${address.port}${base}`)
  }
})
const close = async (): Promise<void> => {
  server.close()
  await client.close()
}
process.once('SIGINT', close)
process.once('SIGTERM', close)
