import {UPDATE_INSTALL_TIMEOUT_MS} from '../shared/plugin-updates'
import {randomBytes} from 'node:crypto'
import {once} from 'node:events'
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http'
import {isAbsolute, relative} from 'node:path'
import type {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {type CallToolResult, CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import {type CodeLocation, connectionSchema} from '../shared/contracts'
import type {ComposerAttachment} from './create-composer-attachment'
import {attachToComposer} from './attach-to-composer'

interface BrowserServerOptions {
  readonly appHtml: string
  readonly html: string
  readonly client: Pick<Client, 'callTool' | 'listTools'>
  readonly composer?: ComposerAttachment
}
interface BrowserLocation {
  readonly url: string
  readonly session: string
  readonly workspace: string
}
interface BrowserServer {
  readonly open: () => Promise<BrowserLocation>
  readonly navigate: (location: CodeLocation) => Promise<CallToolResult>
  readonly close: () => Promise<void>
}
const toolSchema = z.object({
  arguments: z.record(z.string(), z.unknown()).default({}),
  name: z.string(),
})
const metadataSchema = z.object({ui: z.object({visibility: z.array(z.string())})})
const MAX_REQUEST_BYTES = 8_388_608
const TOKEN_BYTES = 32
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  'worker-src blob:',
  "frame-ancestors 'self'",
].join('; ')
const status = {
  badRequest: 400,
  failure: 500,
  forbidden: 403,
  notFound: 404,
  ok: 200,
  tooLarge: 413,
}

const readInput = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > MAX_REQUEST_BYTES) {
      throw new RangeError('Request exceeds 8 MiB.')
    }
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
const sendJson = (response: ServerResponse, value: unknown): void => {
  response.writeHead(status.ok, {'Content-Type': 'application/json'}).end(JSON.stringify(value))
}
const rememberLocation = async (
  request: IncomingMessage,
  response: ServerResponse,
  workspace: string,
  remember: (path: string) => Promise<CallToolResult>,
): Promise<void> => {
  const input = z
    .object({path: z.string().min(1), workspace: z.string()})
    .safeParse(await readInput(request))
  if (!input.success) {
    response.writeHead(status.badRequest).end()
    return
  }
  if (input.data.workspace !== workspace) {
    response.writeHead(status.forbidden).end()
    return
  }
  const result = await remember(input.data.path)
  response
    .writeHead(result.isError ? status.badRequest : status.ok, {'Content-Type': 'application/json'})
    .end('{}')
}
const rejectRequest = (response: ServerResponse, error: unknown): void => {
  const code =
    error instanceof RangeError
      ? status.tooLarge
      : error instanceof SyntaxError
        ? status.badRequest
        : status.failure
  response.writeHead(code).end('Code Viewer request failed.')
}
const forwardTool = (
  input: z.infer<typeof toolSchema>,
  connection: z.infer<typeof connectionSchema>,
) => {
  if (input.name !== 'code.open') {
    return input
  }
  const {path} = input.arguments
  return {
    arguments: {
      ...input.arguments,
      path:
        typeof path === 'string' && isAbsolute(path) ? relative(connection.workspace, path) : path,
      session: connection.session,
    },
    name: 'code.read',
  }
}

const createBrowserNavigation = (client: Pick<Client, 'callTool'>) => {
  let initial: Promise<CallToolResult> | undefined
  let requestVersion = 0
  let retainedVersion = 0
  const subscribers = new Set<ServerResponse>()
  const retain = (version: number, result: CallToolResult): boolean => {
    if (version < retainedVersion) {
      return false
    }
    retainedVersion = version
    initial = Promise.resolve(result)
    return true
  }
  const initialize = (): Promise<CallToolResult> => {
    initial ??= client
      .callTool({arguments: {}, name: 'code.panel'})
      .then((result) => {
        const parsed = CallToolResultSchema.parse(result)
        connectionSchema.parse(parsed.structuredContent)
        return parsed
      })
      .catch((error: unknown) => {
        initial = undefined
        throw error
      })
    return initial
  }
  return {
    initialize,
    navigate: async (location: CodeLocation) => {
      requestVersion += 1
      const version = requestVersion
      const connection = connectionSchema.parse((await initialize()).structuredContent)
      const result = CallToolResultSchema.parse(
        await client.callTool(
          forwardTool({arguments: {...location}, name: 'code.open'}, connection),
        ),
      )
      if (result.isError) {
        return result
      }
      const opened = {
        ...result,
        _meta: {...result._meta, 'winter-love/code-viewer/navigation': {restoreView: false}},
        structuredContent: {...connection, ...result.structuredContent},
      }
      if (retain(version, opened)) {
        const message = `${JSON.stringify(opened)}\n`
        subscribers.forEach((response) => response.write(message))
      }
      return opened
    },
    remember: async (path: string) => {
      requestVersion += 1
      const version = requestVersion
      const connection = connectionSchema.parse((await initialize()).structuredContent)
      const result = CallToolResultSchema.parse(
        await client.callTool(forwardTool({arguments: {path}, name: 'code.open'}, connection)),
      )
      if (!result.isError) {
        retain(version, {
          ...result,
          _meta: {...result._meta, 'winter-love/code-viewer/navigation': {restoreView: true}},
          structuredContent: {...connection, ...result.structuredContent},
        })
      }
      return result
    },
    resume: async () => {
      const result = await initialize()
      const retained = {
        ...result,
        _meta: {...result._meta, 'winter-love/code-viewer/navigation': {restoreView: true}},
      }
      initial = Promise.resolve(retained)
      return retained
    },
    subscribe: async (response: ServerResponse): Promise<void> => {
      const result = await initialize()
      response.writeHead(status.ok, {'Content-Type': 'application/x-ndjson'})
      subscribers.add(response)
      response.once('close', () => subscribers.delete(response))
      response.write(`${JSON.stringify(result)}\n`)
    },
  }
}

const allowedTools = async (
  client: BrowserServerOptions['client'],
  composer?: ComposerAttachment,
) => {
  const {tools} = await client.listTools()
  const allowed = new Set(
    tools
      .filter((tool) => {
        const metadata = metadataSchema.safeParse(tool._meta)
        return metadata.success && metadata.data.ui.visibility.includes('app')
      })
      .map(({name}) => name),
  )
  allowed.add('code.context')
  if (composer !== undefined && allowed.has('code.copy-attachments')) {
    allowed.add('code.attach-to-composer')
  }
  return allowed
}
const appHtml = (html: string, allowed: ReadonlySet<string>): string =>
  allowed.has('code.copy-attachments')
    ? html.replace(
        '<html ',
        [
          '<html data-file-clipboard="true"',
          `data-composer-attachment="${allowed.has('code.attach-to-composer')}" `,
        ].join(' '),
      )
    : html

/** Serves one authenticated loopback viewer backed by the same MCP session as its model tools. */
export const createBrowserServer = async (
  options: BrowserServerOptions,
): Promise<BrowserServer> => {
  const token = randomBytes(TOKEN_BYTES).toString('hex')
  const allowed = await allowedTools(options.client, options.composer)
  const navigation = createBrowserNavigation(options.client)
  const {initialize} = navigation
  const serveTool = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const parsed = toolSchema.safeParse(await readInput(request))
    if (!parsed.success) {
      response.writeHead(status.badRequest).end()
      return
    }
    const input = parsed.data
    const connection = connectionSchema.parse((await initialize()).structuredContent)
    if (
      !allowed.has(input.name) ||
      (input.arguments.session !== undefined && input.arguments.session !== connection.session)
    ) {
      response.writeHead(status.forbidden).end()
      return
    }
    const controller = new AbortController()
    const cancel = (): void => {
      if (!response.writableEnded) {
        controller.abort()
      }
    }
    response.once('close', cancel)
    try {
      if (input.name === 'code.attach-to-composer') {
        if (input.arguments.session !== connection.session || options.composer === undefined) {
          response.writeHead(status.forbidden).end()
          return
        }
        sendJson(
          response,
          await attachToComposer({
            attachment: input.arguments.attachment,
            client: options.client,
            composer: options.composer,
            session: connection.session,
            viewer: `${origin}/#${new URLSearchParams({token})}`,
          }),
        )
        return
      }
      if (input.name === 'code.close') {
        // The MCP process owns the persistent Browser workspace lifetime.
        sendJson(response, {content: [], structuredContent: {retained: true}})
        return
      }
      const result = CallToolResultSchema.parse(
        await options.client.callTool(forwardTool(input, connection), undefined, {
          signal: controller.signal,
          ...(input.name === 'code.update-install' ? {timeout: UPDATE_INSTALL_TIMEOUT_MS} : {}),
        }),
      )
      if (input.name === 'code.open' && !result.isError) {
        sendJson(response, {
          ...result,
          structuredContent: {...connection, ...result.structuredContent},
        })
        return
      }
      sendJson(response, result)
    } finally {
      response.off('close', cancel)
    }
  }
  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    const foreign = request.headers.origin !== undefined && request.headers.origin !== origin
    if (
      `http://${request.headers.host}` !== origin ||
      foreign ||
      request.headers['sec-fetch-site'] === 'cross-site'
    ) {
      response.writeHead(status.forbidden).end()
      return
    }
    if (request.method === 'GET' && (request.url === '/' || request.url === '/app')) {
      response
        .writeHead(status.ok, {
          'Content-Security-Policy': CONTENT_SECURITY_POLICY,
          'Content-Type': 'text/html; charset=utf-8',
        })
        .end(
          request.url === '/'
            ? options.html
            : appHtml(
                options.appHtml.replace('<html ', '<html data-draft-storage="true" '),
                allowed,
              ),
        )
      return
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(status.forbidden).end()
      return
    }
    if (request.method === 'GET' && request.url === '/initial') {
      sendJson(response, await initialize())
      return
    }
    if (request.method === 'GET' && request.url === '/events') {
      await navigation.subscribe(response)
      return
    }
    if (request.method === 'POST' && request.url === '/location') {
      const connection = connectionSchema.parse((await initialize()).structuredContent)
      await rememberLocation(request, response, connection.workspace, navigation.remember)
      return
    }
    if (request.method === 'POST' && request.url === '/tool') {
      await serveTool(request, response)
      return
    }
    response.writeHead(status.notFound).end()
  }
  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      if (!response.destroyed) {
        rejectRequest(response, error)
      }
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Missing browser server address.')
  }
  const origin = `http://127.0.0.1:${address.port}`
  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => (error === undefined ? resolve() : reject(error)))
      }),
    navigate: navigation.navigate,
    open: async () => {
      const {session, workspace} = connectionSchema.parse(
        (await navigation.resume()).structuredContent,
      )
      return {session, url: `${origin}/#${new URLSearchParams({token})}`, workspace}
    },
  }
}
