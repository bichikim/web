import {readdirSync, realpathSync} from 'node:fs'
import {join, relative} from 'node:path'
import type {WorkspaceFile} from '../shared/contracts'
import {resolveFile} from './file-access'
import {isBrowsablePath} from './is-browsable-path'

const MAX_FILES = 10000
/** Lists regular workspace files without following symlinks, reporting an incomplete scan. */
export const readDirectory = (root: string, limit = MAX_FILES) => {
  const canonical = realpathSync(root)
  const files: WorkspaceFile[] = []
  let truncated = false
  const visit = (directory: string): void => {
    const entries = readdirSync(directory, {withFileTypes: true})
      .filter((entry) => isBrowsablePath(entry.name) && (entry.isDirectory() || entry.isFile()))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, {numeric: true}))
    for (const entry of entries) {
      if (files.length >= limit) {
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
  return {files, truncated}
}
