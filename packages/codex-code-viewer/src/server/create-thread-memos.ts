import {randomUUID} from 'node:crypto'
import {mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {z} from 'zod'
import {failure, type Result, success} from '../shared/contracts'
import {
  INITIAL_MEMOS,
  type MemoPatch,
  memoPatchSchema,
  type MemoState,
  memoStateSchema,
} from '../shared/memo-state'

const metadataSchema = z.object({threadId: z.string().uuid()})
const fields = ['expanded', 'items', 'visible'] as const
const fieldPath = (path: string, field: (typeof fields)[number]): string =>
  `${path.slice(0, -'.json'.length)}-${field}.json`

const readSnapshot = (
  path: string,
  schema: z.ZodType<MemoPatch>,
): Result<MemoPatch | undefined> => {
  try {
    return success(schema.parse(JSON.parse(readFileSync(path, 'utf8'))))
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT'
      ? success(undefined)
      : failure('read-failed')
  }
}

const writeSnapshot = (path: string, state: MemoPatch): Result<Record<string, never>> => {
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    mkdirSync(dirname(path), {mode: 0o700, recursive: true})
    writeFileSync(temporary, JSON.stringify(state), {flag: 'wx', mode: 0o600})
    renameSync(temporary, path)
    return success({})
  } catch {
    try {
      rmSync(temporary, {force: true})
    } catch {
      return failure('memo-write-failed')
    }
    return failure('memo-write-failed')
  }
}

export const createThreadMemos = (home: string) => {
  const location = (metadata: unknown): string | undefined => {
    const parsed = metadataSchema.safeParse(metadata)
    return parsed.success
      ? join(home, 'code-viewer', 'memos', `${parsed.data.threadId}.json`)
      : undefined
  }
  const read = (metadata: unknown): Result<MemoState> => {
    const path = location(metadata)
    if (path === undefined) {
      return failure('thread-unavailable')
    }
    const legacy = readSnapshot(path, memoStateSchema)
    if (!legacy.ok) {
      return legacy
    }
    let state: MemoState = {...INITIAL_MEMOS, items: [], ...legacy.value}
    for (const field of fields) {
      const snapshot = readSnapshot(fieldPath(path, field), memoPatchSchema)
      if (!snapshot.ok) {
        return snapshot
      }
      const value = snapshot.value?.[field]
      if (value !== undefined) {
        state = {...state, [field]: value}
      }
    }
    return success(state)
  }
  const write = (metadata: unknown, patch: MemoPatch): Result<MemoState> => {
    const path = location(metadata)
    if (path === undefined) {
      return failure('thread-unavailable')
    }
    const previous = read(metadata)
    if (!previous.ok) {
      return previous
    }
    for (const field of fields) {
      const value = patch[field]
      if (value !== undefined) {
        const saved = writeSnapshot(fieldPath(path, field), {[field]: value})
        if (!saved.ok) {
          return saved
        }
      }
    }
    return read(metadata)
  }
  return {read, write}
}
