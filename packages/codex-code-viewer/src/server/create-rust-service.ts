import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node.js'
import {z} from 'zod'
import {type CodeLocation, type Failure, failure, type Result, success} from '../shared/contracts'
import {readRustLocations} from './rust/read-rust-locations'
import {offsetPosition} from './rust/offset-position'

interface RustProject {
  readonly directory: string
  readonly file: string
  readonly manifest: boolean
}
const statusSchema = z.object({quiescent: z.boolean()})
const analyzerBinary = (): string => {
  const configured = process.env.RUST_ANALYZER_BINARY
  if (configured !== undefined) {
    return configured
  }
  const local = join(
    homedir(),
    '.cargo',
    'bin',
    process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer',
  )
  return existsSync(local) ? local : 'rust-analyzer'
}

export const createRustService = (project: RustProject) => {
  const child = spawn(analyzerBinary(), [], {cwd: project.directory, stdio: 'pipe'})
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
  )
  const ready = Promise.withResolvers<Result<void>>()
  const documents = new Map<string, {source: string; version: number}>()
  let terminal: Failure | undefined
  let initialized = false
  const stop = (error: Failure): void => {
    if (terminal !== undefined) {
      return
    }
    terminal = error
    ready.resolve(error)
    connection.dispose()
    child.kill()
  }
  child.stderr.resume()
  child.once('error', () => stop(failure('rust-analyzer-unavailable')))
  child.once('exit', () =>
    stop(failure(initialized ? 'rust-analysis-failed' : 'rust-analyzer-unavailable')),
  )
  connection.onClose(() =>
    stop(failure(initialized ? 'rust-analysis-failed' : 'rust-analyzer-unavailable')),
  )
  connection.onError(() => stop(failure('rust-analysis-failed')))
  connection.onNotification('experimental/serverStatus', (value: unknown) => {
    const status = statusSchema.safeParse(value)
    if (status.success && status.data.quiescent) {
      ready.resolve(success(undefined))
    }
  })
  connection.listen()
  const initialize = async (): Promise<Result<void>> => {
    try {
      await connection.sendRequest('initialize', {
        capabilities: {
          experimental: {serverStatusNotification: true},
          general: {positionEncodings: ['utf-16']},
          textDocument: {definition: {linkSupport: true}},
        },
        clientInfo: {name: 'codex-code-viewer'},
        initializationOptions: {
          cargo: {buildScripts: {enable: false}, noDeps: true},
          checkOnSave: false,
          detachedFiles: project.manifest ? [] : [project.file],
          diagnostics: {enable: false},
          files: {watcher: 'server'},
          procMacro: {enable: false},
        },
        processId: process.pid,
        rootUri: pathToFileURL(project.directory).href,
        workspaceFolders: [{name: project.directory, uri: pathToFileURL(project.directory).href}],
      })
      initialized = true
      await connection.sendNotification('initialized', {})
      return await ready.promise
    } catch {
      return terminal ?? failure('rust-analysis-failed')
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
          textDocument: {languageId: 'rust', text: source, uri, version: 1},
        })
        documents.set(uri, {source, version: 1})
      } else if (previous.source !== source) {
        const version = previous.version + 1
        await connection.sendNotification('textDocument/didChange', {
          contentChanges: [{text: source}],
          textDocument: {uri, version},
        })
        documents.set(uri, {source, version})
      }
      const targets = await connection.sendRequest<unknown>('textDocument/definition', {
        position: offsetPosition(source, offset),
        textDocument: {uri},
      })
      return readRustLocations(targets)
    } catch {
      return terminal ?? failure('rust-analysis-failed')
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
  return {definitions, dispose: () => stop(failure('rust-analysis-failed'))}
}
