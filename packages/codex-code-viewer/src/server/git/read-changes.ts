import {lstat} from 'node:fs/promises'
import {relative, resolve, sep} from 'node:path'
import type {ChangedFile, WorkspaceChanges} from '../../shared/change-contracts'
import {fileFormat} from '../../shared/file-formats'
import {isBrowsablePath} from '../is-browsable-path'
import {readComparison} from './read-comparison'
import {runGit} from './run-git'

const normalizePath = (root: string, path: string): string | null => {
  const normalized = relative(root, resolve(root, path)).split(sep).join('/')
  return normalized !== '' && !normalized.startsWith('../') && isBrowsablePath(normalized)
    ? normalized
    : null
}

/** Lists the net branch, index and working-tree comparison plus Git-visible untracked files. */
export const readChanges = async (
  root: string,
  signal?: AbortSignal,
): Promise<WorkspaceChanges> => {
  const comparison = await readComparison(root, signal)
  if (comparison === null) {
    return {available: false, base: null, files: []}
  }
  const {revision, base} = comparison
  const [tracked, untracked] = await Promise.all([
    runGit(
      root,
      revision === null
        ? [
            'diff',
            '--cached',
            '--name-status',
            '-z',
            '--relative',
            '--no-renames',
            '--no-ext-diff',
            '--',
            '.',
          ]
        : [
            'diff',
            '--name-status',
            '-z',
            '--relative',
            '--no-renames',
            '--no-ext-diff',
            '--ignore-submodules=all',
            revision,
            '--',
            '.',
          ],
      signal,
    ),
    runGit(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.'], signal),
  ])
  if (!tracked.ok || !untracked.ok) {
    throw new Error('Git comparison could not be read')
  }
  const fields = tracked.output.split('\0')
  const files = new Map<string, ChangedFile>()
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const path = normalizePath(root, fields[index + 1])
    if (path !== null) {
      const status = fields[index]
      files.set(path, {
        kind: status === 'D' ? 'deleted' : status === 'A' ? 'added' : 'modified',
        openable: fileFormat(path) !== undefined,
        path,
      })
    }
  }
  for (const value of untracked.output.split('\0').filter(Boolean)) {
    const path = normalizePath(root, value)
    if (path !== null) {
      files.set(path, {kind: 'added', openable: fileFormat(path) !== undefined, path})
    }
  }
  const entries = await Promise.all(
    [...files.values()].map(async (file) => {
      const stats = await lstat(resolve(root, file.path)).catch(() => null)
      return stats === null ? (file.kind === 'deleted' ? file : null) : stats.isFile() ? file : null
    }),
  )
  return {
    available: true,
    base,
    files: entries.filter((file): file is ChangedFile => file !== null),
  }
}
