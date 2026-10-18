import {createHash, randomUUID} from 'node:crypto'
import {mkdir, readFile, rename, stat, unlink, writeFile} from 'node:fs/promises'
import {join, posix, win32} from 'node:path'
import typescript from '@typescript/typescript6'
import {z} from 'zod'
import type {FileSummary, IndexedSource} from './types'

export interface StoredSource {
  readonly path: string
  readonly source: IndexedSource
  readonly file: FileSummary
}
export interface SourceIndexSnapshot {
  readonly configurations: readonly (readonly [string, string | null])[]
  readonly entries: readonly StoredSource[]
}
interface SourceIndexStoreOptions {
  readonly root: string
  readonly directory: string
}
const FORMAT = `3:${typescript.version}`
const MAX_BYTES = 67108864
const digest = (text: string): string => createHash('sha256').update(text).digest('hex')
const relativePath = z
  .string()
  .refine(
    (path) =>
      path.length > 0 &&
      !path.includes('\\') &&
      !posix.isAbsolute(path) &&
      !win32.isAbsolute(path) &&
      path !== '..' &&
      !path.startsWith('../') &&
      posix.normalize(path) === path,
  )
const summary = z.object({
  fingerprint: z.string(),
  names: z.array(z.string()),
  surface: z.string(),
  uncertain: z.boolean(),
})
const snapshotSchema = z.object({
  configurations: z.array(z.tuple([z.string(), z.string().nullable()])),
  entries: z.array(
    z.object({
      file: z.object({
        dependencies: z.array(relativePath),
        fingerprint: z.string(),
        uncertain: z.boolean(),
      }),
      path: relativePath,
      source: z.object({
        revision: z.string(),
        summary: summary.extend({imports: z.array(z.string())}),
      }),
    }),
  ),
})
const envelopeSchema = z.object({
  checksum: z.string(),
  format: z.literal(FORMAT),
  payload: z.string(),
  root: z.string(),
})

/** Stores regenerable per-file summaries atomically; unavailable or invalid caches are misses. */
export const createSourceIndexStore = ({root, directory}: SourceIndexStoreOptions) => {
  const destination = join(directory, `${digest(root)}.json`)
  return {
    read: async (signal: AbortSignal): Promise<SourceIndexSnapshot | undefined> => {
      signal.throwIfAborted()
      try {
        if ((await stat(destination)).size > MAX_BYTES) {
          return undefined
        }
        const envelope = envelopeSchema.parse(
          JSON.parse(await readFile(destination, {encoding: 'utf8', signal})),
        )
        if (envelope.root !== root || digest(envelope.payload) !== envelope.checksum) {
          return undefined
        }
        const snapshot = snapshotSchema.parse(JSON.parse(envelope.payload))
        return {
          configurations: snapshot.configurations,
          entries: snapshot.entries.map(({file, path, source}) => ({
            file: {...file, names: source.summary.names, surface: source.summary.surface},
            path,
            source,
          })),
        }
      } catch {
        signal.throwIfAborted()
        return undefined
      }
    },
    write: async (snapshot: SourceIndexSnapshot, signal: AbortSignal): Promise<boolean> => {
      signal.throwIfAborted()
      const temporary = `${destination}.${randomUUID()}.tmp`
      try {
        const payload = JSON.stringify({
          ...snapshot,
          entries: snapshot.entries.map(({file, path, source}) => ({
            file: {
              dependencies: file.dependencies,
              fingerprint: file.fingerprint,
              uncertain: file.uncertain,
            },
            path,
            source,
          })),
        })
        const content = JSON.stringify({checksum: digest(payload), format: FORMAT, payload, root})
        if (Buffer.byteLength(content) > MAX_BYTES) {
          return false
        }
        await mkdir(directory, {mode: 0o700, recursive: true})
        await writeFile(temporary, content, {mode: 0o600, signal})
        signal.throwIfAborted()
        await rename(temporary, destination)
        return true
      } catch {
        signal.throwIfAborted()
        return false
      } finally {
        // Regenerable cache cleanup must not interrupt navigation or its cancellation.
        await unlink(temporary).catch(() => undefined)
      }
    },
  }
}
