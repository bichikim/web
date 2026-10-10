import {readdir, realpath, stat} from 'node:fs/promises'
import {join, relative, resolve, sep} from 'node:path'
import type {WorkspaceFile} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {isWithin} from './file-access'
import {isBrowsablePath} from './is-browsable-path'
import {fileRevision} from './file-revision'
import {getDependencyPaths} from './get-dependency-paths'

interface DirectoryRevision {
  readonly path: string
  readonly revision: string
}
export interface DirectoryListing {
  readonly directories: readonly DirectoryRevision[]
  readonly files: readonly WorkspaceFile[]
  readonly excludedPaths: readonly string[]
  readonly truncated: boolean
  readonly complete?: boolean
}
export interface DirectoryScanOptions {
  readonly signal?: AbortSignal
  readonly excludedPaths?: readonly string[]
}
const BATCH_SIZE = 256
const normalized = (root: string, path: string): string => relative(root, path).split(sep).join('/')

/** Reads one directory's regular entries without following symbolic links. */
export async function* scanShallowDirectory(
  root: string,
  directory: string,
  options: DirectoryScanOptions = {},
): AsyncGenerator<DirectoryListing> {
  options.signal?.throwIfAborted()
  const canonical = await realpath(directory)
  if (canonical !== resolve(directory) || !isWithin(root, canonical)) {
    throw new Error('Directory outside workspace or replaced by a symbolic link')
  }
  const children = await readdir(canonical, {withFileTypes: true})
  options.signal?.throwIfAborted()
  const excludedPaths = getDependencyPaths(
    children.filter((entry) => entry.isFile()).map((entry) => entry.name),
  ).map((path) => join(canonical, path))
  const directoryRevision = {
    path: canonical,
    revision: fileRevision(await stat(canonical, {bigint: true})),
  }
  const directories: DirectoryRevision[] = [directoryRevision]
  const files: WorkspaceFile[] = []
  for (const entry of children) {
    options.signal?.throwIfAborted()
    const path = join(canonical, entry.name)
    const included =
      isBrowsablePath(normalized(root, path)) &&
      ![...excludedPaths, ...(options.excludedPaths ?? [])].includes(path)
    if (included) {
      if (entry.isDirectory()) {
        if (
          // oxlint-disable-next-line no-await-in-loop -- Check only the next directory before continuing discovery.
          await stat(join(path, 'pyvenv.cfg')).then(
            (value) => value.isFile(),
            () => false,
          )
        ) {
          excludedPaths.push(path)
        } else {
          directories.push({path, revision: ''})
        }
      } else if (entry.isFile()) {
        files.push({openable: fileFormat(path) !== undefined, path: normalized(root, path)})
      }
      if (files.length + directories.length - 1 >= BATCH_SIZE) {
        yield {
          complete: false,
          directories: [...directories],
          excludedPaths: [...excludedPaths],
          files: [...files],
          truncated: false,
        }
        directories.splice(1)
        files.splice(0)
      }
    }
  }
  options.signal?.throwIfAborted()
  yield {complete: true, directories, excludedPaths, files, truncated: false}
}

/** Yields shallow listings before visiting their descendants, without an entry limit. */
export async function* walkDirectory(
  root: string,
  options: DirectoryScanOptions = {},
): AsyncGenerator<DirectoryListing> {
  const canonical = await realpath(root)
  const pending = [canonical]
  const excludedPaths = new Set(options.excludedPaths)
  for (let cursor = 0; cursor < pending.length; cursor += 1) {
    options.signal?.throwIfAborted()
    const directory = pending[cursor]
    try {
      // oxlint-disable-next-line no-await-in-loop -- Yield a parent before opening its descendants and bound concurrent I/O.
      for await (const listing of scanShallowDirectory(canonical, directory, {
        excludedPaths: [...excludedPaths],
        signal: options.signal,
      })) {
        for (const path of listing.excludedPaths) {
          excludedPaths.add(path)
        }
        pending.push(...listing.directories.slice(1).map((entry) => entry.path))
        yield listing
      }
    } catch (error) {
      options.signal?.throwIfAborted()
      if (directory === canonical) {
        throw error
      }
      yield {
        directories: [{path: directory, revision: ''}],
        excludedPaths: [],
        files: [],
        truncated: true,
      }
    }
  }
}

/** Collects an asynchronous recursive scan without an entry limit. */
export const readDirectory = async (
  root: string,
  options: DirectoryScanOptions = {},
): Promise<DirectoryListing> => {
  const directories = new Map<string, DirectoryRevision>()
  const files: WorkspaceFile[] = []
  const excludedPaths = new Set<string>()
  let truncated = false
  for await (const listing of walkDirectory(root, options)) {
    for (const directory of listing.directories) {
      directories.set(directory.path, directory)
    }
    files.push(...listing.files)
    listing.excludedPaths.forEach((path) => excludedPaths.add(path))
    truncated ||= listing.truncated
  }
  return {
    directories: [...directories.values()],
    excludedPaths: [...excludedPaths],
    files,
    truncated,
  }
}
