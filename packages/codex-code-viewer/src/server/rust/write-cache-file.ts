import {mkdir, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'

interface WriteCacheFileOptions {
  readonly bytes: Uint8Array
  readonly path: string
  readonly mode: number
}

/** Publishes a complete cache file atomically, accepting an identical concurrent writer. */
export const writeCacheFile = async (options: WriteCacheFileOptions): Promise<void> => {
  const directory = dirname(options.path)
  await mkdir(directory, {recursive: true})
  const staged = await mkdtemp(join(directory, '.pending-'))
  const file = join(staged, 'artifact')
  try {
    await writeFile(file, options.bytes, {mode: options.mode})
    try {
      await rename(file, options.path)
    } catch (error) {
      const current = await readFile(options.path).catch(() => undefined)
      if (current === undefined || !current.equals(options.bytes)) {
        throw error
      }
    }
  } finally {
    await rm(staged, {force: true, recursive: true})
  }
}
