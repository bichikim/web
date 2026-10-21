import {randomUUID} from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {isAbsolute, join} from 'node:path'
import {z} from 'zod'
import {failure, type Result, success} from '../shared/contracts'

const metadataSchema = z.object({threadId: z.string().uuid()})
const workspaceSchema = z.object({workspace: z.string().refine(isAbsolute)})

/** 채팅별 뷰어 작업 폴더를 별도 파일에 저장하며 Codex의 채팅 작업 경로는 수정하지 않습니다. */
export const createThreadWorkspaces = (home: string) => {
  const directory = join(home, 'code-viewer', 'workspaces')
  const location = (metadata: unknown): string | undefined => {
    const parsed = metadataSchema.safeParse(metadata)
    return parsed.success ? join(directory, `${parsed.data.threadId}.json`) : undefined
  }
  const read = (metadata: unknown): Result<string | undefined> => {
    const path = location(metadata)
    if (path === undefined) {
      return success(undefined)
    }
    try {
      return success(workspaceSchema.parse(JSON.parse(readFileSync(path, 'utf8'))).workspace)
    } catch (error) {
      return error instanceof Error && 'code' in error && error.code === 'ENOENT'
        ? success(undefined)
        : failure('read-failed')
    }
  }
  const write = (metadata: unknown, workspace: string): Result<Record<string, never>> => {
    const path = location(metadata)
    if (path === undefined) {
      return failure('thread-unavailable')
    }
    let canonical: string
    try {
      if (!isAbsolute(workspace) || !statSync(workspace).isDirectory()) {
        return failure('invalid-workspace')
      }
      canonical = realpathSync(workspace)
    } catch {
      return failure('invalid-workspace')
    }
    const temporary = `${path}.${randomUUID()}.tmp`
    try {
      mkdirSync(directory, {mode: 0o700, recursive: true})
      writeFileSync(temporary, JSON.stringify({workspace: canonical}), {flag: 'wx', mode: 0o600})
      renameSync(temporary, path)
      return success({})
    } catch {
      try {
        if (existsSync(temporary)) {
          rmSync(temporary, {force: true})
        }
      } catch {
        return failure('workspace-write-failed')
      }
      return failure('workspace-write-failed')
    }
  }
  return {read, write}
}
