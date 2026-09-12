import {readdir, rm, stat, utimes, writeFile} from 'node:fs/promises'
import {join} from 'node:path'

const CLEANUP_INTERVAL = 86_400_000
const CACHE_RETENTION = 604_800_000
const CACHE_FILE = /^[a-f\d]{64}\.json(?:\.[\w-]+\.tmp)?$/u

/** Removes week-old cache files unless cleanup succeeded within the last day. */
export const pruneTransformCache = async (directory: string, now = Date.now()): Promise<void> => {
  const marker = join(directory, '.last-cleanup')
  try {
    const previous = await stat(marker).catch(() => null)
    if (previous !== null && now - previous.mtimeMs < CLEANUP_INTERVAL) {
      return
    }
    const entries = await readdir(directory, {withFileTypes: true})
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && CACHE_FILE.test(entry.name))
        .map(async (entry) => {
          const path = join(directory, entry.name)
          const metadata = await stat(path).catch(() => null)
          if (metadata !== null && now - metadata.mtimeMs >= CACHE_RETENTION) {
            await rm(path, {force: true})
          }
        }),
    )
    await writeFile(marker, '')
    await utimes(marker, new Date(now), new Date(now))
  } catch {
    // Cleanup is optional; unavailable caches must not fail the build.
  }
}
