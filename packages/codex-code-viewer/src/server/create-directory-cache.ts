import {stat} from 'node:fs/promises'
import {sep} from 'node:path'
import {fileRevision} from './file-revision'
import {type DirectoryListing, scanShallowDirectory} from './read-directory'

/** Caches completed shallow scans and invalidates only requested directory listings. */
export const createDirectoryCache = (root: string) => {
  const listings = new Map<string, DirectoryListing>()
  const policies = new Map<string, readonly string[]>()
  let mutation = 0
  async function* scan(directory: string, signal: AbortSignal): AsyncGenerator<DirectoryListing> {
    signal.throwIfAborted()
    const cached = listings.get(directory)
    const revision =
      cached === undefined ? null : fileRevision(await stat(directory, {bigint: true}))
    if (cached !== undefined && cached.directories[0].revision === revision) {
      yield cached
      return
    }
    const version = mutation
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
      if (listing.complete && version === mutation) {
        policies.set(directory, listing.excludedPaths)
        listings.set(directory, {...listing, directories: [...directories.values()], files})
      }
      yield listing
    }
  }
  return {
    clear: (): void => {
      listings.clear()
      policies.clear()
      mutation += 1
    },
    excluded: (path: string): boolean =>
      [...policies.values()].some((paths) =>
        paths.some((entry) => path === entry || path.startsWith(`${entry}${sep}`)),
      ),
    invalidate: (path: string): void => {
      listings.delete(path)
      mutation += 1
    },
    resetPolicy: (directory: string): void => {
      policies.delete(directory)
    },
    scan,
  }
}
