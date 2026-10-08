import {existsSync, readFileSync, realpathSync, statSync} from 'node:fs'
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path'
import {failure, type Result, success} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'

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
    ) ??
    ancestors.find((parent) =>
      ['Cargo.toml', 'pyproject.toml', 'pyrightconfig.json', 'Gemfile', 'gems.rb'].some((marker) =>
        existsSync(resolve(parent, marker)),
      ),
    ) ??
    initial
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
  if (fileFormat(candidate) === undefined) {
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
      fileFormat(canonical) === undefined
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
    const bytes = readFileSync(resolved.value)
    if (bytes.includes(0)) {
      return failure('unsupported-file')
    }
    try {
      return success(new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes))
    } catch {
      return failure('unsupported-file')
    }
  } catch {
    return failure('read-failed')
  }
}
