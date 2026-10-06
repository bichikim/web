import {existsSync, readFileSync, realpathSync, statSync} from 'node:fs'
import {basename, dirname, extname, isAbsolute, relative, resolve, sep} from 'node:path'
import {failure, type Result, success} from '../shared/contracts'

const EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'])
const MAX_BYTES = 524288
const PRIVATE_DIRECTORIES = new Set(['.git', '.codex', '.aws', '.ssh'])

export const isWithin = (root: string, path: string): boolean => {
  const distance = relative(root, path)
  return distance !== '..' && !distance.startsWith(`..${sep}`) && !isAbsolute(distance)
}

export const findWorkspace = (path: string): string => {
  const initial = dirname(realpathSync(path))
  const ancestors: string[] = []
  let directory = initial
  while (dirname(directory) !== directory) {
    ancestors.push(directory)
    directory = dirname(directory)
  }
  return (
    ancestors.find(
      (parent) =>
        existsSync(resolve(parent, 'pnpm-workspace.yaml')) || existsSync(resolve(parent, '.git')),
    ) ?? initial
  )
}

export const resolveFile = (root: string, path: string): Result<string> => {
  const candidate = resolve(root, path)
  if (!isAbsolute(path) && !isWithin(root, candidate)) {
    return failure('outside-workspace')
  }
  if (
    relative(root, candidate)
      .split(sep)
      .some((part) => PRIVATE_DIRECTORIES.has(part))
  ) {
    return failure('outside-workspace')
  }
  if (!EXTENSIONS.has(extname(candidate)) || basename(candidate).startsWith('.')) {
    return failure('unsupported-file')
  }
  try {
    const canonical = realpathSync(candidate)
    if (!isWithin(root, canonical)) {
      return failure('outside-workspace')
    }
    if (
      relative(root, canonical)
        .split(sep)
        .some((part) => PRIVATE_DIRECTORIES.has(part)) ||
      basename(canonical).startsWith('.') ||
      !EXTENSIONS.has(extname(canonical))
    ) {
      return failure('unsupported-file')
    }
    return success(canonical)
  } catch {
    return failure('not-found')
  }
}

export const readSource = (root: string, path: string): Result<string> => {
  const resolved = resolveFile(root, path)
  if (!resolved.ok) {
    return resolved
  }
  try {
    const stats = statSync(resolved.value)
    if (!stats.isFile()) {
      return failure('unsupported-file')
    }
    if (stats.size > MAX_BYTES) {
      return failure('too-large')
    }
    const source = readFileSync(resolved.value, 'utf8')
    return source.includes('\0') ? failure('unsupported-file') : success(source)
  } catch {
    return failure('read-failed')
  }
}
