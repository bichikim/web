import {createHash, randomUUID} from 'node:crypto'
import {mkdir, readFile, rename, rm, utimes, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {z} from 'zod'
import {pruneTransformCache} from './prune-transform-cache'

interface CachedTransform {
  readonly code: string
  readonly map: string | null
}

const transformSchema = z.object({code: z.string(), map: z.string().nullable()})

const readTransform = async (path: string): Promise<CachedTransform | null> => {
  try {
    return transformSchema.parse(JSON.parse(await readFile(path, 'utf8')))
  } catch {
    // Cache failures must not prevent the original transform from running.
    return null
  }
}

const writeTransform = async (path: string, result: CachedTransform): Promise<void> => {
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(result))
    await rename(temporary, path)
  } catch {
    // A read-only or full cache must not fail the build.
  } finally {
    await rm(temporary, {force: true}).catch(() => undefined)
  }
}

export const createTransformCache = (directory: string, fingerprint: string) => {
  const ready = mkdir(directory, {recursive: true})
    .then(() => pruneTransformCache(directory))
    .catch(() => undefined)
  return async (
    input: string,
    compute: () => Promise<CachedTransform | null>,
  ): Promise<CachedTransform | null> => {
    const key = createHash('sha256')
      .update(JSON.stringify([fingerprint, input]))
      .digest('hex')
    const path = join(directory, `${key}.json`)
    await ready
    const cached = await readTransform(path)
    if (cached !== null) {
      const now = new Date()
      // Retain recently used entries without making cache maintenance block the build.
      await utimes(path, now, now).catch(() => undefined)
      return cached
    }
    const result = await compute()
    if (result !== null) {
      await writeTransform(path, result)
    }
    return result
  }
}
