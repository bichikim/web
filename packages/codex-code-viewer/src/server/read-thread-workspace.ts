import {readdirSync} from 'node:fs'
import {isAbsolute, join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {z} from 'zod'
import {failure, type Result, success} from '../shared/contracts'

interface ThreadWorkspaceInput {
  readonly home: string
  readonly metadata: unknown
}
const metadataSchema = z.object({threadId: z.string().uuid()})
const rowSchema = z.object({cwd: z.string().min(1)})
const databaseVersion = (name: string): number =>
  Number(name.slice('state_'.length, -'.sqlite'.length))

/** Returns only the invoking thread's absolute working directory from local Codex metadata. */
export const readThreadWorkspace = ({
  home,
  metadata,
}: ThreadWorkspaceInput): Result<string | undefined> => {
  const parsed = metadataSchema.safeParse(metadata)
  if (!parsed.success) {
    return success(undefined)
  }
  try {
    const [name] = readdirSync(home)
      .filter((entry) => /^state_\d+\.sqlite$/u.test(entry))
      .toSorted((left, right) => databaseVersion(right) - databaseVersion(left))
    if (name === undefined) {
      return success(undefined)
    }
    const database = new DatabaseSync(join(home, name), {readOnly: true})
    try {
      const row = rowSchema.safeParse(
        database.prepare('SELECT cwd FROM threads WHERE id = ?').get(parsed.data.threadId),
      )
      return success(row.success && isAbsolute(row.data.cwd) ? row.data.cwd : undefined)
    } finally {
      database.close()
    }
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT'
      ? success(undefined)
      : failure('read-failed')
  }
}
