import {readdirSync, realpathSync, statSync} from 'node:fs'
import {join, relative} from 'node:path'
import type {WorkspaceFile} from '../shared/contracts'
import {resolveFile} from './file-access'
import {isBrowsablePath} from './is-browsable-path'
import {fileRevision} from './file-revision'

interface DirectoryRevision {
  readonly path: string
  readonly revision: string
}
export interface DirectoryListing {
  readonly directories: readonly DirectoryRevision[]
  readonly files: readonly WorkspaceFile[]
  readonly truncated: boolean
}
const MAX_FILES = 10000
/** Lists regular workspace files without following symlinks, reporting an incomplete scan. */
export const readDirectory = (root: string, limit = MAX_FILES): DirectoryListing => {
  const canonical = realpathSync(root)
  const files: WorkspaceFile[] = []
  const directories: DirectoryRevision[] = []
  let truncated = false
  const visit = (directory: string): void => {
    directories.push({path: directory, revision: fileRevision(statSync(directory, {bigint: true}))})
    const entries = readdirSync(directory, {withFileTypes: true})
      .filter(
        (entry) =>
          isBrowsablePath(entry.name) &&
          ((entry.isDirectory() && !entry.name.startsWith('.')) || entry.isFile()),
      )
      .sort((left, right) => left.name.localeCompare(right.name, undefined, {numeric: true}))
    for (const entry of entries) {
      if (files.length + directories.length - 1 >= limit) {
        truncated = true
        return
      }
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(path)
      } else {
        files.push({openable: resolveFile(canonical, path).ok, path: relative(canonical, path)})
      }
    }
  }
  visit(canonical)
  return {directories, files, truncated}
}
