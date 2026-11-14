import {readFileSync} from 'node:fs'
import {relative, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import type {MessageConnection} from 'vscode-jsonrpc/node.js'
import {z} from 'zod'
import {createNativeTransport} from './create-native-transport'
import {createNativePreparation} from './create-native-preparation'
import {createResultDelivery} from './create-result-delivery'
import {createDiagnosticLog} from './create-diagnostic-log'
import {readCompilerSource} from '../read-compiler-source'
import {requestNativeMessage} from './request-native-message'
import {withAbort} from '../with-abort'
import {offsetPosition} from '../../headless/position'
import type {NativeLocation, NativeOptions, NativePreparationOptions, NativeQuery} from './types'

const positionSchema = z.object({character: z.number(), line: z.number()})
const rangeSchema = z.object({end: positionSchema, start: positionSchema})
const locationSchema = z.union([
  z.object({range: rangeSchema, uri: z.string()}),
  z.object({targetSelectionRange: rangeSchema, targetUri: z.string()}),
])
const locationsSchema = z.array(locationSchema).nullable()
const normalizeNativeLocations = (value: unknown, root: string): NativeLocation[] =>
  (locationsSchema.parse(value) ?? []).map((location) => {
    const uri = 'uri' in location ? location.uri : location.targetUri
    const range = 'range' in location ? location.range : location.targetSelectionRange
    return {
      column: range.start.character + 1,
      line: range.start.line + 1,
      path: relative(root, fileURLToPath(uri)).split('\\').join('/'),
    }
  })

interface DocumentPreparation {
  readonly open: (path: string, source?: string) => Promise<void>
  readonly opened: Pick<ReadonlyMap<string, unknown>, 'has'>
  readonly paths: readonly string[]
  readonly preparation: Pick<ReturnType<typeof createNativePreparation>, 'prepare'>
  readonly retained: Set<string>
  readonly root: string
  readonly options?: NativePreparationOptions
  readonly sources?: ReadonlyMap<string, string>
}
const prepareDocuments = async ({
  open,
  opened,
  paths,
  preparation,
  retained,
  root,
  options,
  sources,
}: DocumentPreparation): Promise<void> => {
  const signal = options?.signal
  signal?.throwIfAborted()
  const saved: string[] = []
  for (const path of paths) {
    signal?.throwIfAborted()
    const absolute = resolve(root, path)
    const supplied = sources?.get(absolute)
    if (supplied !== undefined || opened.has(absolute)) {
      // oxlint-disable-next-line no-await-in-loop -- Synchronize drafts before preparing their saved project members.
      await open(path, supplied)
    } else {
      saved.push(absolute)
    }
  }
  if (saved.length === 0) {
    options?.dispatched?.()
    return
  }
  if (await preparation.prepare(saved, signal, options?.dispatched)) {
    saved.forEach((path) => retained.add(path))
    return
  }
  // Closing a failed API connection also releases its earlier project references.
  const restore = new Set([...retained, ...saved])
  retained.clear()
  for (const path of restore) {
    signal?.throwIfAborted()
    if (!opened.has(path)) {
      // oxlint-disable-next-line no-await-in-loop -- Restore all project coverage when switching to document preparation.
      await open(path, sources?.get(path))
    }
  }
  options?.dispatched?.()
}

interface NativeInitialization {
  readonly connection: Pick<MessageConnection, 'sendNotification' | 'sendRequest'>
  readonly recordNotification: (value: unknown) => void
  readonly open: (file: string, source?: string) => Promise<void>
  readonly options: NativeOptions
  readonly spawning: Promise<unknown>
}
const initializeNativeClient = async ({
  connection,
  recordNotification,
  open,
  options,
  spawning,
}: NativeInitialization): Promise<void> => {
  await spawning
  const capabilities = await connection.sendRequest<unknown>('initialize', {
    capabilities: {
      general: {positionEncodings: ['utf-16']},
      textDocument: {definition: {linkSupport: true}},
      window: {workDoneProgress: true},
    },
    clientInfo: {name: 'codex-code-viewer'},
    initializationOptions: {
      disablePushDiagnostics: true,
      userPreferences: {suggest: {autoImports: false}},
    },
    processId: process.pid,
    rootUri: pathToFileURL(options.root).href,
    workspaceFolders: [{name: options.root, uri: pathToFileURL(options.root).href}],
  })
  recordNotification({capabilities})
  await connection.sendNotification('initialized', {})
  for (const path of options.documents) {
    // oxlint-disable-next-line no-await-in-loop -- Preserve the document order delivered to the server.
    await open(path)
  }
}

const createDocumentWriter = (
  root: string,
  connection: Pick<MessageConnection, 'sendNotification'>,
) => {
  const opened = new Map<string, {source: string; version: number}>()
  const open = async (file: string, provided?: string): Promise<void> => {
    const path = resolve(root, file)
    const source = provided ?? readFileSync(path, 'utf8')
    const previous = opened.get(path)
    if (previous === undefined) {
      opened.set(path, {source, version: 1})
      await connection.sendNotification('textDocument/didOpen', {
        textDocument: {
          languageId: /\.[cm]?jsx?$/u.test(path) ? 'javascript' : 'typescript',
          text: source,
          uri: pathToFileURL(path).href,
          version: 1,
        },
      })
    } else if (previous.source !== source) {
      const version = previous.version + 1
      opened.set(path, {source, version})
      await connection.sendNotification('textDocument/didChange', {
        contentChanges: [{text: source}],
        textDocument: {uri: pathToFileURL(path).href, version},
      })
    }
  }
  return {open, opened}
}

/** Runs the native LSP independently, preserving its unmodified results and progress messages. */
export const createNativeClient = (options: NativeOptions) => {
  const notifications = createDiagnosticLog<unknown>()
  const errors = createDiagnosticLog<string>()
  const transport = createNativeTransport({...options, onStderr: errors.append})
  const {connection} = transport
  const preparation = createNativePreparation(connection)
  const retained = new Set<string>()
  let partialBatches = 0
  let sequence = 0
  const receivers = new Map<string | number, NativeOptions['receive']>()
  connection.onRequest('client/registerCapability', () => null)
  connection.onRequest('window/workDoneProgress/create', () => null)
  connection.onRequest('workspace/configuration', (value: unknown) =>
    z
      .object({items: z.array(z.unknown())})
      .parse(value)
      .items.map(() => ({})),
  )
  connection.onNotification('$/progress', (value: unknown) => {
    notifications.append(value)
    const progress = z
      .object({token: z.union([z.string(), z.number()]), value: z.unknown()})
      .parse(value)
    const receive = receivers.get(progress.token)
    if (receive !== undefined) {
      partialBatches += 1
      receive(normalizeNativeLocations(progress.value, options.root))
    }
  })
  connection.onNotification('window/logMessage', notifications.append)
  const {open, opened} = createDocumentWriter(options.root, connection)
  const ready = initializeNativeClient({
    connection,
    open,
    options,
    recordNotification: notifications.append,
    spawning: transport.started,
  })
  return {
    diagnostics: () => ({
      errorOmissions: errors.omitted(),
      errors: errors.read(),
      notificationOmissions: notifications.omitted(),
      notifications: notifications.read(),
      opened: opened.size,
      partialBatches,
      preparation: preparation.diagnostics(),
    }),
    dispose: (): Promise<void> => {
      preparation.dispose()
      retained.clear()
      return transport.dispose(ready).finally(() => {
        errors.clear()
        notifications.clear()
      })
    },
    prepare: async (
      paths: readonly string[],
      sources?: ReadonlyMap<string, string>,
      preparationOptions?: NativePreparationOptions,
    ): Promise<void> => {
      await withAbort(ready, preparationOptions?.signal)
      await prepareDocuments({
        open,
        opened,
        options: preparationOptions,
        paths,
        preparation,
        retained,
        root: options.root,
        sources,
      })
    },
    query: async ({
      document = 'open',
      file,
      source,
      offset,
      kind,
      includeDeclaration = false,
      receive = options.receive,
      signal,
      sources,
    }: NativeQuery): Promise<NativeLocation[]> => {
      signal?.throwIfAborted()
      await withAbort(ready, signal)
      signal?.throwIfAborted()
      const path = resolve(options.root, file)
      let needsOverlay = document === 'open' || opened.has(path) || sources?.has(path) === true
      if (
        document === 'disk' &&
        sources?.get(path) !== source &&
        readFileSync(path, 'utf8') !== source
      ) {
        if (readCompilerSource(path) !== source) {
          throw new Error('stale-source')
        }
        // Preserve compiler-decoded offsets for BOM and UTF-16 documents.
        needsOverlay = true
      }
      if (needsOverlay) {
        await open(file, source)
      }
      sequence += 1
      const token = `navigation-results-${sequence}`
      const delivery = createResultDelivery(receive)
      receivers.set(token, delivery.publish)
      const params = {
        partialResultToken: token,
        position: offsetPosition(source, offset),
        textDocument: {uri: pathToFileURL(resolve(options.root, file)).href},
      }
      try {
        const value = await requestNativeMessage(
          connection,
          `textDocument/${kind}`,
          kind === 'references' ? {...params, context: {includeDeclaration}} : params,
          signal,
        )
        const locations = normalizeNativeLocations(value, options.root)
        delivery.publish(locations)
        await delivery.drain(signal)
        return locations
      } finally {
        receivers.delete(token)
      }
    },
  }
}
