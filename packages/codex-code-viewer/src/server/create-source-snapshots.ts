import {type BigIntStats, statSync} from 'node:fs'
import {readFile, stat} from 'node:fs/promises'
import {resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {fileRevision} from './file-revision'
import {readCompilerSource} from './read-compiler-source'

interface SourceSnapshot {
  readonly revision: string
  readonly snapshot: typescript.IScriptSnapshot
}
interface SnapshotMetadata {
  readonly revision: (file: string) => string
  readonly record: (file: string, stats: BigIntStats) => void
}
const UTF16_LE_BOM = Buffer.from('fffe', 'hex')
const UTF16_BE_BOM = Buffer.from('feff', 'hex')
const UTF8_BOM = Buffer.from('efbbbf', 'hex')
const diskRevision = (file: string): string => {
  try {
    const stats = statSync(file, {bigint: true})
    return fileRevision(stats)
  } catch {
    return 'missing'
  }
}
const sourceText = (bytes: Buffer): string => {
  const startsWith = (marker: Uint8Array) => marker.every((value, index) => bytes[index] === value)
  if (startsWith(UTF16_LE_BOM)) {
    return bytes.toString('utf16le', UTF16_LE_BOM.length)
  }
  if (startsWith(UTF16_BE_BOM)) {
    const length = bytes.length - (bytes.length % UTF16_BE_BOM.length)
    return Buffer.from(bytes.subarray(0, length)).swap16().toString('utf16le', UTF16_BE_BOM.length)
  }
  return bytes.toString('utf8', startsWith(UTF8_BOM) ? UTF8_BOM.length : 0)
}
const throwIfCancelled = (cancelled?: () => boolean): void => {
  if (cancelled?.() === true) {
    throw new typescript.OperationCanceledException()
  }
}
/** Retains document snapshots and refreshes filesystem metadata once per navigation operation. */
export const createSourceSnapshots = (
  sources: ReadonlyMap<string, string>,
  metadata?: SnapshotMetadata,
) => {
  const readRevision = metadata?.revision ?? diskRevision
  const snapshots = new Map<string, SourceSnapshot>()
  const revisions = new Map<string, string>()
  let generation = 0
  const version = (file: string): string => {
    const known = revisions.get(file)
    if (known !== undefined) {
      return known
    }
    const draft = sources.get(resolve(file))
    const revision = draft === undefined ? readRevision(file) : `draft:${draft}`
    revisions.set(file, revision)
    return revision
  }
  const read = (file: string): typescript.IScriptSnapshot | undefined => {
    const revision = version(file)
    const previous = snapshots.get(file)
    if (previous?.revision === revision) {
      return previous.snapshot
    }
    const source = sources.get(resolve(file)) ?? readCompilerSource(file)
    if (source === undefined) {
      snapshots.delete(file)
      return undefined
    }
    const snapshot = typescript.ScriptSnapshot.fromString(source)
    snapshots.set(file, {revision, snapshot})
    return snapshot
  }
  const prepareSource = async (file: string, cancelled?: () => boolean): Promise<void> => {
    const current = generation
    let prepared: BigIntStats | undefined
    throwIfCancelled(cancelled)
    if (snapshots.has(file)) {
      return
    }
    const draft = sources.get(resolve(file))
    if (draft !== undefined) {
      read(file)
      return
    }
    try {
      const stats = await stat(file, {bigint: true})
      const revision = fileRevision(stats)
      const bytes = await readFile(file)
      throwIfCancelled(cancelled)
      if (current === generation) {
        revisions.set(file, revision)
        snapshots.set(file, {
          revision,
          snapshot: typescript.ScriptSnapshot.fromString(sourceText(bytes)),
        })
        prepared = stats
      }
    } catch {
      throwIfCancelled(cancelled)
      // Unavailable files retain the synchronous compiler reader's existing fallback behavior.
    }
    if (prepared !== undefined) {
      metadata?.record(file, prepared)
    }
  }
  return {
    checkpoint: (paths: Iterable<string>): ReadonlyMap<string, string> =>
      new Map(
        [...paths].map((file) => {
          const revision = version(file)
          return [file, revision === 'missing' ? 'unreadable' : revision]
        }),
      ),
    dispose: () => {
      generation += 1
      snapshots.clear()
      revisions.clear()
    },
    prepare: async (paths: readonly string[], cancelled?: () => boolean): Promise<void> => {
      const BATCH_SIZE = 64
      for (let offset = 0; offset < paths.length; offset += BATCH_SIZE) {
        throwIfCancelled(cancelled)
        // oxlint-disable-next-line no-await-in-loop -- Bound parallel source reads and drain them before cancellation escapes.
        const batch = await Promise.allSettled(
          paths.slice(offset, offset + BATCH_SIZE).map((file) => prepareSource(file, cancelled)),
        )
        const failed = batch.find((result) => result.status === 'rejected')
        if (failed?.status === 'rejected') {
          throw failed.reason
        }
      }
    },
    read,
    refresh: (): boolean => {
      generation += 1
      const previous = [...revisions]
      revisions.clear()
      let changed = false
      for (const [file, revision] of previous) {
        if (revision !== version(file)) {
          read(file)
          changed = true
        }
      }
      return changed
    },
    version,
  }
}
