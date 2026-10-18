import {withAbort} from './with-abort'
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
import {requestSymbols} from './lsp/request-symbols'
import {readConfiguration} from './lsp/read-configuration'
import {createWorkspaceSync} from './lsp/create-workspace-sync'
import type {SourceChange, SymbolLookup} from './types'

interface LspLookup extends SymbolLookup {
  readonly indexed?: boolean
  readonly retainDrafts?: boolean
}
interface LspReadiness {
  readonly method: string
  readonly complete: (value: unknown) => boolean
}
interface LspService {
  /** Queries an analyzer-discovered document without opening it or replacing the active draft. */
  lookupIndexedSymbols(
    path: string,
    source: string,
    offset: number,
    lookup: LspLookup,
  ): Promise<Result<CodeLocation[]>>
  lookupSymbols(
    path: string,
    source: string,
    offset: number,
    lookup: LspLookup,
  ): Promise<Result<CodeLocation[]>>
  dispose(): void
  update(root: string, changes: readonly SourceChange[]): void
}
interface CreateLspServiceOptions {
  readonly command: string
  readonly arguments: readonly string[]
  readonly directory: string
  readonly environment?: NodeJS.ProcessEnv
  readonly onStop?: () => void
  readonly language: string
  readonly processGroup?: boolean
  readonly positionEncoding?: 'utf-16' | 'utf-32'
  readonly unavailable: ViewerError['code']
  readonly failed: ViewerError['code']
  readonly capabilities?: Readonly<Record<string, unknown>>
  readonly initialization?: Readonly<Record<string, unknown>>
  readonly configuration?: Readonly<Record<string, unknown>>
  readonly readiness?: LspReadiness
  readonly waitForReferenceDiagnostics?: boolean
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
    ...(options.environment === undefined ? {} : {env: options.environment}),
    ...(grouped ? {detached: true} : {}),
    stdio: 'pipe',
  })
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
  )
  const ready = Promise.withResolvers<Result<void>>()
  const documents = createWorkspaceSync({
    connection,
    diagnostics: options.waitForReferenceDiagnostics,
    encoding: options.positionEncoding,
    language: options.language,
  })
  let terminal: Failure | undefined
  let initialized = false
  let incremental = false
  const stop = (error: Failure): void => {
    if (terminal !== undefined) {
      return
    }
    terminal = error
    ready.resolve(error)
    documents.dispose()
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
    options.onStop?.()
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
  connection.onRequest('workspace/configuration', (value: unknown) =>
    readConfiguration(value, options.configuration),
  )
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
    lookup: LspLookup,
  ): Promise<Result<CodeLocation[]>> => {
    const {kind, draft = false} = lookup
    const synchronize = lookup.indexed !== true
    const prepared = await withAbort(initialization, lookup.signal)
    if (!prepared.ok) {
      return prepared
    }
    if (terminal !== undefined) {
      return terminal
    }
    try {
      const uri = synchronize
        ? await documents.synchronize(path, source, incremental, {
            draft,
            retainDrafts: lookup.retainDrafts,
          })
        : pathToFileURL(path).href
      if (synchronize && kind === 'references') {
        await withAbort(documents.waitForAnalysis(uri), lookup.signal)
      }
      if (terminal !== undefined) {
        return terminal
      }
      return await requestSymbols({
        connection,
        encoding: options.positionEncoding,
        failed: options.failed,
        offset,
        request: lookup,
        source,
        uri,
      })
    } catch {
      lookup.signal?.throwIfAborted()
      return terminal ?? failure(options.failed)
    }
  }
  let pending = Promise.resolve()
  const lookupSymbols = (
    path: string,
    source: string,
    offset: number,
    request: LspLookup,
  ): Promise<Result<CodeLocation[]>> => {
    const result = pending.then(() => lookup(path, source, offset, request))
    pending = result.then(
      () => undefined,
      () => undefined,
    )
    return withAbort(result, request.signal)
  }
  return {
    dispose: () => stop(failure(options.failed)),
    lookupIndexedSymbols: (path, source, offset, request) =>
      lookupSymbols(path, source, offset, {...request, indexed: true}),
    lookupSymbols,
    update: documents.update,
  }
}
