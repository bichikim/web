import {readFile, realpath, stat} from 'node:fs/promises'
import {resolve} from 'node:path'
import {MAX_CODE_BYTES} from '../../shared/editing-limits'
import {fileRevision} from '../file-revision'
import {isWithin} from '../file-access'
import {summarizeSource} from './summarize-source'
import type {IndexedSource} from './types'

interface ReadIndexedSourceOptions {
  readonly root: string
  readonly path: string
  readonly previous: IndexedSource | undefined
  readonly signal: AbortSignal
  readonly generation: number
}
const unreadable = (revision: string): IndexedSource => ({
  revision,
  summary: {fingerprint: revision, imports: [], names: [], surface: revision, uncertain: true},
})

/** Reads changed local source metadata, retaining uncertainty when content cannot be indexed. */
export const readIndexedSource = async (
  options: ReadIndexedSourceOptions,
): Promise<IndexedSource | null> => {
  const candidate = resolve(options.root, options.path)
  try {
    const canonical = await realpath(candidate)
    if (canonical !== candidate || !isWithin(options.root, canonical)) {
      return unreadable(`outside:${options.generation}`)
    }
    const stats = await stat(canonical, {bigint: true})
    const revision = fileRevision(stats)
    if (options.previous?.revision === revision) {
      return options.previous
    }
    if (!stats.isFile() || stats.size > BigInt(MAX_CODE_BYTES)) {
      return unreadable(revision)
    }
    const source = await readFile(canonical, {signal: options.signal})
    if (source.includes(0)) {
      return unreadable(revision)
    }
    const text = new TextDecoder('utf-8', {fatal: true}).decode(source)
    return {revision, summary: summarizeSource(options.path, text)}
  } catch (error) {
    options.signal.throwIfAborted()
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    return unreadable(`unreadable:${options.generation}`)
  }
}
