import {readdir, readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {z} from 'zod'

const metadataSchema = z.object({
  hostSessionId: z.string().regex(/^local_[a-f0-9-]{36}$/u),
  pid: z.number().int().positive(),
  sessionId: z.string(),
})
const readMetadata = async (path: string) => {
  try {
    const parsed = metadataSchema.safeParse(JSON.parse(await readFile(path, 'utf8')))
    return parsed.success ? parsed.data : undefined
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && 'code' in error && error.code === 'ENOENT')
    ) {
      return undefined
    }
    throw error
  }
}

/** Resolves one CLI session's Desktop identity from non-secret per-process session records. */
export const resolveDesktopSession = async (
  session: string,
  directory: string,
): Promise<string> => {
  const files = (await readdir(directory)).filter((file) => /^\d+\.json$/u.test(file))
  const records = await Promise.all(
    files.map(async (file) => ({
      file,
      metadata: await readMetadata(join(directory, file)),
    })),
  )
  const matches = new Set(
    records.flatMap(({file, metadata}) =>
      metadata !== undefined && metadata.sessionId === session && file === `${metadata.pid}.json`
        ? [metadata.hostSessionId]
        : [],
    ),
  )
  if (matches.size !== 1) {
    throw new Error('현재 Code 세션의 Desktop 식별자를 하나로 확인하지 못했습니다.')
  }
  return [...matches][0]!
}
