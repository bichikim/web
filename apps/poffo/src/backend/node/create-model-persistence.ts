import {mkdir, stat} from 'node:fs/promises'
import {join} from 'node:path'
import {createEmptyDocument, type PuppetDocument} from '@winter-love/puppet/player'
import {readDocumentPath} from './read-document-path'
import {resolveWorkspacePath} from './resolve-workspace-path'
import {writeDocumentPath} from './write-document-path'
import {serializeNodeDocumentFile} from './serialize-document-file'

/** Owns committed recovery snapshots; the caller awaits flush before shutting down. */
export const createModelPersistence = async (workspace: string, file?: string) => {
  const directory = join(workspace, '.poffo')
  const recovery = join(directory, 'recovery.poffo')
  const PRIVATE_DIRECTORY = 0o700
  await mkdir(directory, {mode: PRIVATE_DIRECTORY, recursive: true})
  await resolveWorkspacePath(workspace, '.poffo', 'read')
  const input = file === undefined ? recovery : await resolveWorkspacePath(workspace, file, 'read')
  const exists = await stat(input).catch((error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT' &&
      file === undefined
    ) {
      return undefined
    }
    throw error
  })
  const loaded = exists === undefined ? undefined : await readDocumentPath(input)
  if (loaded !== undefined && !loaded.ok) {
    throw new Error(`Document import failed: ${loaded.error.code}`)
  }
  const initial = loaded?.ok === true ? loaded.document : createEmptyDocument()
  let checkpoint = initial
  let writes = Promise.resolve()
  let failure: unknown = null
  return {
    connectionPath: join(directory, 'connection.json'),
    flush: async () => {
      await writes
      if (failure !== null) {
        throw new Error('Recovery persistence failed', {cause: failure})
      }
    },
    initial,
    isSaved: (document: PuppetDocument) => document === checkpoint,
    markSaved: (document: PuppetDocument) => {
      checkpoint = document
    },
    persistRecovery: (document: PuppetDocument) => {
      writes = writes
        .then(async () => {
          await writeDocumentPath({
            content: await serializeNodeDocumentFile(document, 'poffo'),
            overwrite: true,
            path: recovery,
          })
          failure = null
        })
        .catch((error: unknown) => {
          failure = error
        })
    },
  }
}
