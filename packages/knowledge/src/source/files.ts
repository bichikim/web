import {execFile} from 'node:child_process'
import {constants} from 'node:fs'
import {lstat, open, readFile, realpath} from 'node:fs/promises'
import {extname, join} from 'node:path'
import {promisify} from 'node:util'
import ignore from 'ignore'
import picomatch from 'picomatch'

import type {ParseKnowledgeDocumentOptions} from '../parsing/document'

export interface ReadKnowledgeFilesOptions {
  readonly root: string
  readonly include: ReadonlyArray<string>
  readonly exclude: ReadonlyArray<string>
  readonly maxBytes?: number
}

export interface SourceReadError {
  readonly code: 'source-read-failed'
  readonly path: string
  readonly detail: string
}

export type ReadKnowledgeFilesResult =
  | {readonly ok: true; readonly value: ReadonlyArray<ParseKnowledgeDocumentOptions>}
  | {readonly ok: false; readonly error: SourceReadError}

const execute = promisify(execFile)
const MAX_FILE_BYTES = 1_048_576
const MAX_LIST_BYTES = 33_554_432
const DEFAULT_EXCLUDES = [
  '.git/',
  'node_modules/',
  '.knowledge/',
  '.env*',
  '*.pem',
  '*.key',
  'credentials*',
  'secrets/',
  '.ssh/',
  '.aws/',
]

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

const readDocument = async (
  root: string,
  path: string,
  maxBytes: number,
): Promise<ParseKnowledgeDocumentOptions | undefined> => {
  const absolute = join(root, path)
  let info
  try {
    info = await lstat(absolute)
  } catch (error) {
    if (isMissing(error)) {
      return undefined
    }
    throw error
  }
  if (!info.isFile() || (await realpath(absolute)) !== absolute) {
    return undefined
  }
  if (info.size > maxBytes) {
    throw new Error(`Document exceeds ${maxBytes} bytes`)
  }
  // oxlint-disable-next-line no-bitwise -- Combine OS open flags to reject symlinks.
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const bytes = await handle.readFile()
    if (bytes.length > maxBytes) {
      throw new Error(`Document exceeds ${maxBytes} bytes`)
    }
    return {
      format: extname(path).toLowerCase() === '.md' ? 'markdown' : 'text',
      path,
      source: new TextDecoder('utf-8', {fatal: true}).decode(bytes),
    }
  } finally {
    await handle.close()
  }
}

/** Reads Git-visible Markdown/text files as a complete snapshot; selected read failures abort it. */
export const readKnowledgeFiles = async (
  options: ReadKnowledgeFilesOptions,
): Promise<ReadKnowledgeFilesResult> => {
  let currentPath = '.'
  try {
    const root = await realpath(options.root)
    const excluded = ignore().add(DEFAULT_EXCLUDES)
    const custom = ignore()
    try {
      custom.add(await readFile(join(root, '.knowledgeignore'), 'utf8'))
    } catch (error) {
      if (!isMissing(error)) {
        throw error
      }
    }
    const included = picomatch([...options.include], {dot: true})
    const omitted = picomatch([...options.exclude], {dot: true})
    const {stdout} = await execute(
      'git',
      ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--deduplicate'],
      {encoding: 'utf8', maxBuffer: MAX_LIST_BYTES},
    )
    const documents: ParseKnowledgeDocumentOptions[] = []
    for (const path of [...new Set(stdout.split('\0').filter(Boolean))].toSorted()) {
      currentPath = path
      const extension = extname(path).toLowerCase()
      if (
        (extension === '.md' || extension === '.txt') &&
        included(path) &&
        !omitted(path) &&
        !excluded.ignores(path) &&
        !custom.ignores(path)
      ) {
        // oxlint-disable-next-line no-await-in-loop -- Bound file descriptors and stop at the first failed source.
        const document = await readDocument(root, path, options.maxBytes ?? MAX_FILE_BYTES)
        if (document !== undefined) {
          documents.push(document)
        }
      }
    }
    return {ok: true, value: documents}
  } catch (error) {
    return {
      error: {
        code: 'source-read-failed',
        detail: error instanceof Error ? error.message : String(error),
        path: currentPath,
      },
      ok: false,
    }
  }
}
