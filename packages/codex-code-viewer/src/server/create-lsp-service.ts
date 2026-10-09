import {spawn} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node.js'
import {z} from 'zod'
import {
  type CodeLocation,
  type Failure,
  failure,
  type Result,
  success,
  type ViewerError,
} from '../shared/contracts'
import {readDefinitionLocations} from './lsp/read-definition-locations'
import {offsetPosition} from './lsp/offset-position'

interface LspReadiness {
  readonly method: string
  readonly complete: (value: unknown) => boolean
}
interface LspDocument {
  readonly source: string
  readonly version: number
}
interface LspService {
  definitions(path: string, source: string, offset: number): Promise<Result<CodeLocation[]>>
  dispose(): void
}
interface CreateLspServiceOptions {
  readonly command: string
  readonly arguments: readonly string[]
  readonly directory: string
  readonly language: string
  readonly processGroup?: boolean
  readonly positionEncoding?: 'utf-16' | 'utf-32'
  readonly unavailable: ViewerError['code']
  readonly failed: ViewerError['code']
  readonly capabilities?: Readonly<Record<string, unknown>>
  readonly initialization?: Readonly<Record<string, unknown>>
  readonly configuration?: Readonly<Record<string, unknown>>
  readonly readiness?: LspReadiness
}

const incrementalSchema = z.object({
  capabilities: z.object({
    textDocumentSync: z.union([z.literal(2), z.object({change: z.literal(2)})]),
  }),
})

export const createLspService = (options: CreateLspServiceOptions): LspService => {
  const grouped = options.processGroup === true && process.platform !== 'win32'
  const child = spawn(options.command, [...options.arguments], {
    cwd: options.directory,
    ...(grouped ? {detached: true} : {}),
    stdio: 'pipe',
  })
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
  )
  const ready = Promise.withResolvers<Result<void>>()
  const documents = new Map<string, LspDocument>()
  let terminal: Failure | undefined
  let initialized = false
  let incremental = false
  const stop = (error: Failure): void => {
    if (terminal !== undefined) {
      return
    }
    terminal = error
    ready.resolve(error)
    connection.dispose()
    if (grouped && child.pid !== undefined) {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill()
      }
    } else {
      child.kill()
    }
  }
  child.stderr.resume()
  child.once('error', () => stop(failure(options.unavailable)))
  child.once('exit', () => stop(failure(initialized ? options.failed : options.unavailable)))
  connection.onClose(() => stop(failure(initialized ? options.failed : options.unavailable)))
  connection.onError(() => stop(failure(options.failed)))
  if (options.readiness !== undefined) {
    connection.onNotification(options.readiness.method, (value: unknown) => {
      if (options.readiness?.complete(value)) {
        ready.resolve(success(undefined))
      }
    })
  }
  connection.onRequest('workspace/configuration', (value: unknown) => {
    const request = z
      .object({items: z.array(z.object({section: z.string().optional()}))})
      .parse(value)
    return request.items.map((item) =>
      item.section === undefined ? null : (options.configuration?.[item.section] ?? null),
    )
  })
  connection.listen()
  const initialize = async (): Promise<Result<void>> => {
    try {
      const response = await connection.sendRequest<unknown>('initialize', {
        capabilities: {
          ...options.capabilities,
          general: {positionEncodings: [options.positionEncoding ?? 'utf-16']},
          textDocument: {definition: {linkSupport: true}},
          workspace: {configuration: options.configuration !== undefined},
        },
        clientInfo: {name: 'codex-code-viewer'},
        initializationOptions: options.initialization,
        processId: process.pid,
        rootUri: pathToFileURL(options.directory).href,
        workspaceFolders: [{name: options.directory, uri: pathToFileURL(options.directory).href}],
      })
      incremental = incrementalSchema.safeParse(response).success
      initialized = true
      await connection.sendNotification('initialized', {})
      if (options.readiness === undefined) {
        ready.resolve(success(undefined))
      }
      return await ready.promise
    } catch {
      const error = terminal ?? failure(options.failed)
      stop(error)
      return error
    }
  }
  const initialization = initialize()
  const lookup = async (
    path: string,
    source: string,
    offset: number,
  ): Promise<Result<CodeLocation[]>> => {
    const prepared = await initialization
    if (!prepared.ok) {
      return prepared
    }
    if (terminal !== undefined) {
      return terminal
    }
    const uri = pathToFileURL(path).href
    const previous = documents.get(uri)
    try {
      if (previous === undefined) {
        await connection.sendNotification('textDocument/didOpen', {
          textDocument: {languageId: options.language, text: source, uri, version: 1},
        })
        documents.set(uri, {source, version: 1})
      } else if (previous.source !== source) {
        const version = previous.version + 1
        await connection.sendNotification('textDocument/didChange', {
          contentChanges: [
            {
              ...(incremental
                ? {
                    range: {
                      end: offsetPosition(
                        previous.source,
                        previous.source.length,
                        options.positionEncoding,
                      ),
                      start: {character: 0, line: 0},
                    },
                  }
                : {}),
              text: source,
            },
          ],
          textDocument: {uri, version},
        })
        documents.set(uri, {source, version})
      }
      const targets = await connection.sendRequest<unknown>('textDocument/definition', {
        position: offsetPosition(source, offset, options.positionEncoding),
        textDocument: {uri},
      })
      return readDefinitionLocations(targets, options.failed)
    } catch {
      return terminal ?? failure(options.failed)
    }
  }
  let pending = Promise.resolve()
  const definitions = (
    path: string,
    source: string,
    offset: number,
  ): Promise<Result<CodeLocation[]>> => {
    const result = pending.then(() => lookup(path, source, offset))
    pending = result.then(() => undefined)
    return result
  }
  return {definitions, dispose: () => stop(failure(options.failed))}
}
