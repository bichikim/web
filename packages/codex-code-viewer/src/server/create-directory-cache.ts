import {stat} from 'node:fs/promises'
import {sep} from 'node:path'
import {fileRevision} from './file-revision'
import {type DirectoryListing, scanShallowDirectory} from './read-directory'

/** Caches completed shallow scans and invalidates only requested directory listings. */
export const createDirectoryCache = (root: string) => {
  const listings = new Map<string, DirectoryListing>()
  const policies = new Map<string, readonly string[]>()
  const revisions = new Map<string, number>()
  let epoch = 0
  let generation = 0
  async function* scan(directory: string, signal: AbortSignal): AsyncGenerator<DirectoryListing> {
    signal.throwIfAborted()
    const cached = listings.get(directory)
    const revision =
      cached === undefined ? null : fileRevision(await stat(directory, {bigint: true}))
    if (
      cached !== undefined &&
      listings.get(directory) === cached &&
      cached.directories[0].revision === revision
    ) {
      yield cached
      return
    }
    const version = revisions.get(directory) ?? 0
    revisions.set(directory, version)
    const reset = epoch
    const directories = new Map<string, DirectoryListing['directories'][number]>()
    const files: DirectoryListing['files'][number][] = []
    const inherited = [...policies.entries()]
      .filter(([path]) => path !== directory)
      .flatMap(([, paths]) => paths)
    for await (const listing of scanShallowDirectory(root, directory, {
      excludedPaths: inherited,
      signal,
    })) {
      signal.throwIfAborted()
      for (const entry of listing.directories) {
        directories.set(entry.path, entry)
      }
      files.push(...listing.files)
      let completed = listing
      if (
        listing.complete &&
        !listing.truncated &&
        reset === epoch &&
        version === revisions.get(directory)
      ) {
        generation += 1
        completed = {...listing, version: String(generation)}
        policies.set(directory, listing.excludedPaths)
        listings.set(directory, {...completed, directories: [...directories.values()], files})
      }
      yield completed
    }
  }
  return {
    clear: (): void => {
      listings.clear()
      policies.clear()
      revisions.clear()
      epoch += 1
    },
    excluded: (path: string): boolean =>
      [...policies.values()].some((paths) =>
        paths.some((entry) => path === entry || path.startsWith(`${entry}${sep}`)),
      ),
    invalidate: (path: string): void => {
      listings.delete(path)
      const revision = revisions.get(path)
      if (revision !== undefined) {
        revisions.set(path, revision + 1)
      }
    },
    resetPolicy: (directory: string): void => {
      policies.delete(directory)
    },
    scan,
  }
}
