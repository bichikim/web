import {createServer} from 'node:http'
import {randomBytes, randomUUID} from 'node:crypto'
import {readFile, rm, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {encodeModelEvent} from '../model-events'
import {createModelBackend} from '../create-model-backend'
import {createCommandService} from '../create-command-service'
import {readDocumentPath} from './read-document-path'
import {writeDocumentPath} from './write-document-path'
import {resolveWorkspacePath} from './resolve-workspace-path'
import {createModelPersistence} from './create-model-persistence'
import {createRenderBroker} from './create-render-broker'
import {createHostClients} from './create-host-clients'
import {createHostHandler} from './create-host-handler'
import {serializeNodeDocumentFile} from './serialize-document-file'

export interface HostConnection {
  readonly version: 1
  readonly url: string
  readonly token: string
  readonly sessionId: string
  readonly pid: number
}

export interface StartNodeHostOptions {
  /** Local root permitted for input/output and recovery files. */
  readonly workspace: string
  /** Optional initial document path within the workspace; omitted, restore recovery or start empty. */
  readonly file?: string
  /** Loopback port; omitted, let the OS select an available port. */
  readonly port?: number
  /** Built GUI files; omitted when a development middleware is attached. */
  readonly guiRoot?: string
  /** Additional native app origins; omitted, accept only same-origin browser requests. */
  readonly trustedOrigins?: ReadonlyArray<string>
}

/** Starts one authoritative loopback model host; the caller owns shutdown and GUI middleware. */
export const startNodeHost = async (options: StartNodeHostOptions) => {
  const workspace = resolve(options.workspace)
  const persistence = await createModelPersistence(workspace, options.file)
  const model = createModelBackend({
    document: persistence.initial,
    onCommit: persistence.persistRecovery,
    sessionId: randomUUID(),
  })
  const renderer = createRenderBroker()
  let closing = false
  const service = createCommandService({
    files: {
      read: async (path) => readDocumentPath(await resolveWorkspacePath(workspace, path, 'read')),
      write: async (path, content, overwrite) => {
        await writeDocumentPath({
          content,
          overwrite,
          path: await resolveWorkspacePath(workspace, path, 'write'),
        })
      },
    },
    model,
    onSaved: persistence.markSaved,
    render: (_document, input) => {
      if (closing) {
        throw new Error('host-closing: frame capture rejected during shutdown')
      }
      return renderer.render(input)
    },
    serialize: serializeNodeDocumentFile,
  })
  const TOKEN_BYTES = 32
  const token = randomBytes(TOKEN_BYTES).toString('base64url')
  let url = ''
  const clients = createHostClients(model, renderer)
  const canStop = () =>
    model.read().transaction === null && persistence.isSaved(model.read().document)
  const close = async (discard = false) => {
    if (closing) {
      return
    }
    if (!discard && !canStop()) {
      throw new Error('unsaved-document: save or explicitly discard')
    }
    closing = true
    renderer.cancelAll()
    await service.whenIdle()
    if (!discard && !canStop()) {
      closing = false
      throw new Error('unsaved-document: save or explicitly discard')
    }
    try {
      await persistence.flush()
    } catch (error) {
      if (!discard) {
        closing = false
        throw error
      }
    }
    clients.close()
    const closed = new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)))
    })
    server.closeAllConnections()
    await closed
    const stored = await readFile(persistence.connectionPath, 'utf8').catch(() => '')
    if (stored === JSON.stringify(connection)) {
      await rm(persistence.connectionPath)
    }
  }
  const handler = createHostHandler({
    canStop,
    clients,
    guiRoot: options.guiRoot,
    isClosing: () => closing,
    renderer,
    service,
    snapshot: () => encodeModelEvent(model.read(), clients.sequence()),
    stop: close,
    token,
    trustedOrigins: options.trustedOrigins,
    url: () => url,
  })
  const server = createServer(handler.handle)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Host did not bind a loopback port')
  }
  url = `http://127.0.0.1:${address.port}`
  const connection: HostConnection = {
    pid: process.pid,
    sessionId: model.read().sessionId,
    token,
    url,
    version: 1,
  }
  const PRIVATE_FILE = 0o600
  await writeFile(persistence.connectionPath, JSON.stringify(connection), {
    flag: 'wx',
    mode: PRIVATE_FILE,
  }).catch(async (error: unknown) => {
    clients.close()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
    throw error
  })
  return {
    close,
    connection,
    connectionPath: persistence.connectionPath,
    model,
    server,
    service,
    setMiddleware: handler.setMiddleware,
  }
}
