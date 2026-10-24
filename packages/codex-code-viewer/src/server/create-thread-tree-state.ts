import {createHash, randomUUID} from 'node:crypto'
import {mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {z} from 'zod'
import {failure, type Result, success} from '../shared/contracts'
import {type TreeState, treeStateSchema} from '../shared/tree-state'

const metadataSchema = z.object({threadId: z.string().uuid()})
const fields = ['expanded', 'visible'] as const
const fieldPath = (path: string, field: (typeof fields)[number]): string =>
  `${path.slice(0, -'.json'.length)}-${field}.json`

const readSnapshot = (path: string): Result<TreeState | undefined> => {
  try {
    return success(treeStateSchema.parse(JSON.parse(readFileSync(path, 'utf8'))))
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      console.error('Code Viewer ignored an invalid tree state snapshot.')
      return success(undefined)
    }
    return error instanceof Error && 'code' in error && error.code === 'ENOENT'
      ? success(undefined)
      : failure('read-failed')
  }
}

const writeSnapshot = (path: string, state: TreeState): Result<Record<string, never>> => {
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
      return failure('workspace-write-failed')
    }
    return failure('workspace-write-failed')
  }
}

/** 채팅·작업 폴더별 상태를 필드마다 기록하고 기존 통합 스냅샷도 복원합니다. */
export const createThreadTreeState = (home: string) => {
  const directory = join(home, 'code-viewer', 'trees')
  const location = (metadata: unknown, workspace: string): string | undefined => {
    const parsed = metadataSchema.safeParse(metadata)
    const digest = createHash('sha256').update(workspace).digest('hex')
    return parsed.success ? join(directory, `${parsed.data.threadId}-${digest}.json`) : undefined
  }
  const read = (metadata: unknown, workspace: string): Result<TreeState | undefined> => {
    const path = location(metadata, workspace)
    if (path === undefined) {
      return success(undefined)
    }
    const legacy = readSnapshot(path)
    if (!legacy.ok) {
      return legacy
    }
    let state = legacy.value
    for (const field of fields) {
      const snapshot = readSnapshot(fieldPath(path, field))
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
  const write = (metadata: unknown, workspace: string, patch: TreeState): Result<TreeState> => {
    const path = location(metadata, workspace)
    if (path === undefined) {
      return failure('thread-unavailable')
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
    const saved = read(metadata, workspace)
    return saved.ok ? success(saved.value ?? {}) : saved
  }
  return {read, write}
}
