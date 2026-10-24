import {link, lstat, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {parse} from 'yaml'
import {KnowledgeCommandFailure} from './runtime'

const MAX_FILE_BYTES = 16_777_216
/** Reads bounded YAML or JSON input and reports only a stable diagnostic code on failure. */
export const readArtifact = async (path: string): Promise<unknown> => {
  try {
    const metadata = await stat(path)
    if (!metadata.isFile() || metadata.size > MAX_FILE_BYTES) {
      throw new Error('Invalid artifact size or type')
    }
    const source = await readFile(path, 'utf8')
    if (Buffer.byteLength(source) > MAX_FILE_BYTES) {
      throw new Error('Invalid artifact size')
    }
    return parse(source, {maxAliasCount: 100})
  } catch {
    throw new KnowledgeCommandFailure({error: {code: 'evaluation-file-invalid'}, ok: false})
  }
}
/** Rejects existing output paths, including symlinks, before generation starts. */
export const assertArtifactAbsent = async (path: string): Promise<void> => {
  try {
    await lstat(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw new KnowledgeCommandFailure({error: {code: 'evaluation-output-unavailable'}, ok: false})
  }
  throw new KnowledgeCommandFailure({error: {code: 'evaluation-output-exists'}, ok: false})
}
export interface WriteArtifactOptions {
  readonly path: string
  readonly value: unknown
}
/** Atomically publishes a new JSON file without replacing an existing path. */
export const writeArtifact = async (options: WriteArtifactOptions): Promise<void> => {
  const directory = await mkdtemp(join(dirname(options.path), '.knowledge-artifact-'))
  const temporary = join(directory, 'data.json')
  try {
    const data = `${JSON.stringify(options.value, null, 2)}\n`
    if (Buffer.byteLength(data) > MAX_FILE_BYTES) {
      throw new Error('Invalid artifact size')
    }
    await writeFile(temporary, data, {flag: 'wx', mode: 0o600})
    await link(temporary, options.path)
  } catch {
    throw new KnowledgeCommandFailure({error: {code: 'evaluation-output-unavailable'}, ok: false})
  } finally {
    await rm(directory, {force: true, recursive: true})
  }
}
