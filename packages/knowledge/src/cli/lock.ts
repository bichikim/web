import {open, unlink} from 'node:fs/promises'
import {join} from 'node:path'

/** Holds one local process lock; an interrupted process leaves a lock requiring manual removal. */
export const withKnowledgeLock = async <T>(
  directory: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const path = join(directory, 'index.lock')
  let handle
  try {
    handle = await open(path, 'wx')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      throw new Error(`Index already running, or an interrupted run left a lock: ${path}`)
    }
    throw error
  }
  try {
    await handle.writeFile(`${process.pid}\n`)
    return await operation()
  } finally {
    await handle.close()
    await unlink(path)
  }
}
