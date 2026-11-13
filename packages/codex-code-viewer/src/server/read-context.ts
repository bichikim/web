import {realpathSync, statSync} from 'node:fs'
import {relative, resolve, sep} from 'node:path'
import {failure, type Result, success} from '../shared/contracts'
import {isWithin, readSource} from './file-access'
import {isBrowsablePath} from './is-browsable-path'
import {scanShallowDirectory} from './read-directory'
import {MAX_CONTEXT_BYTES, MAX_CONTEXT_LINES} from '../shared/context-limits'

interface ReadContextInput {
  readonly root: string
  readonly path: string
  readonly line?: number
  readonly endLine?: number
}

/** Reads a bounded text snapshot or shallow folder listing inside the selected workspace. */
export const readContext = async (input: ReadContextInput): Promise<Result<{text: string}>> => {
  const candidate = resolve(input.root, input.path)
  if (
    !isWithin(input.root, candidate) ||
    (candidate !== input.root &&
      !isBrowsablePath(relative(input.root, candidate).split(sep).join('/')))
  ) {
    return failure('outside-workspace')
  }
  try {
    const canonical = realpathSync(candidate)
    if (!isWithin(input.root, canonical) || canonical !== candidate) {
      return failure('outside-workspace')
    }
    const path = relative(input.root, canonical).split(sep).join('/') || '.'
    if (statSync(canonical).isDirectory()) {
      const scan = scanShallowDirectory(input.root, canonical)
      try {
        const next = await scan.next()
        if (next.done) {
          return success({text: path})
        }
        const batch = next.value
        const entries = [
          ...batch.directories.slice(1).map(({path}) => `${relative(input.root, path)}/`),
          ...batch.files.map(({path}) => path),
        ]
        const truncated = !batch.complete || entries.length > MAX_CONTEXT_LINES
        const suffix = truncated ? '\n[Listing truncated]' : ''
        const text = `${path}\n${entries.slice(0, MAX_CONTEXT_LINES).join('\n')}${suffix}`
        return Buffer.byteLength(text) > MAX_CONTEXT_BYTES
          ? failure('context-too-large')
          : success({text})
      } finally {
        await scan.return(undefined)
      }
    }
    const source = readSource(input.root, canonical)
    if (!source.ok) {
      return source
    }
    const rows = source.value.split(/\r\n|\n|\r/u)
    const line = input.line ?? 1
    const end = Math.min(
      input.endLine ?? line + MAX_CONTEXT_LINES - 1,
      line + MAX_CONTEXT_LINES - 1,
      rows.length,
    )
    if (line > rows.length || end < line) {
      return failure('invalid-position')
    }
    const suffix = end < rows.length ? '\n[More lines available]' : ''
    const text = `${path}:${line}-${end}\n${rows.slice(line - 1, end).join('\n')}${suffix}`
    return Buffer.byteLength(text) > MAX_CONTEXT_BYTES
      ? failure('context-too-large')
      : success({text})
  } catch {
    return failure('not-found')
  }
}
