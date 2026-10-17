import {pathToFileURL} from 'node:url'
import type {MessageConnection} from 'vscode-jsonrpc/node.js'
import {readSource} from '../file-access'
import type {SourceChange} from '../types'
import {createDocumentSync} from './create-document-sync'

interface PendingChange {
  readonly root: string
  readonly kind: SourceChange['kind']
}
interface WorkspaceSyncOptions {
  readonly connection: MessageConnection
  readonly language: string
  readonly encoding?: 'utf-16' | 'utf-32'
  readonly diagnostics?: boolean
}

interface DocumentOwnership {
  readonly draft?: boolean
  readonly retainDrafts?: boolean
}
/** Synchronizes changed workspace files and replaces temporary draft ownership between queries. */
export const createWorkspaceSync = (options: WorkspaceSyncOptions) => {
  const {connection} = options
  const documents = createDocumentSync(
    connection,
    options.language,
    options.encoding,
    options.diagnostics,
  )
  const changed = new Map<string, PendingChange>()
  const drafts = new Set<string>()
  let disposed = false
  const notify = (path: string, type: number) =>
    connection.sendNotification('workspace/didChangeWatchedFiles', {
      changes: [{type, uri: pathToFileURL(path).href}],
    })
  const synchronize = async (
    path: string,
    source: string,
    incremental: boolean,
    ownership: DocumentOwnership = {},
  ) => {
    for (const file of ownership.retainDrafts === true ? [] : drafts) {
      if (file !== path) {
        // oxlint-disable-next-line no-await-in-loop -- Release prior drafts before reindexing their saved contents.
        await documents.close(file)
        // oxlint-disable-next-line no-await-in-loop -- Solargraph also needs its workspace index refreshed after didClose.
        await notify(file, 2)
      }
    }
    if (ownership.retainDrafts !== true) {
      drafts.clear()
    }
    const updates = [...changed]
    changed.clear()
    for (const [file, {root, kind}] of updates) {
      // oxlint-disable-next-line no-await-in-loop -- Refresh project membership before synchronizing client-managed content.
      await notify(file, {changed: 2, created: 1, deleted: 3}[kind])
      const content = readSource(root, file)
      if (content.ok) {
        // oxlint-disable-next-line no-await-in-loop -- Deliver changed documents before querying their relationships.
        await documents.synchronize(file, content.value, incremental)
      } else {
        // oxlint-disable-next-line no-await-in-loop -- Release deleted documents before requesting references.
        await documents.close(file)
      }
    }
    const uri = await documents.synchronize(path, source, incremental)
    if (ownership.draft === true) {
      drafts.add(path)
    }
    return uri
  }
  return {
    dispose: () => {
      disposed = true
      changed.clear()
      drafts.clear()
      documents.dispose()
    },
    synchronize,
    update: (root: string, changes: readonly SourceChange[]) => {
      if (!disposed) {
        changes.forEach(({kind, path}) => changed.set(path, {kind, root}))
      }
    },
    waitForAnalysis: documents.waitForAnalysis,
  }
}
