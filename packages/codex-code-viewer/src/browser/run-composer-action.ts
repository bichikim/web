import {execFile} from 'node:child_process'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'

const replySchema = z.discriminatedUnion('ok', [
  z.object({ok: z.literal(true), session: z.string().optional()}),
  z.object({
    code: z.enum([
      'composer-permission-required',
      'composer-target-missing',
      'composer-attachment-failed',
    ]),
    detail: z.string().optional(),
    ok: z.literal(false),
  }),
])
export const runComposerAction = async (
  application: string,
  args: readonly string[],
): Promise<z.infer<typeof replySchema>> => {
  const directory = await mkdtemp(join(tmpdir(), 'code-viewer-composer-'))
  const output = join(directory, 'reply.json')
  try {
    await writeFile(output, '', {mode: 0o600})
    const error = await new Promise<Error | null>((resolve) => {
      execFile(
        '/usr/bin/open',
        ['-n', '-W', '-g', '--stdout', output, application, '--args', ...args],
        {encoding: 'utf8', maxBuffer: 4096, timeout: 10_000},
        (error) => resolve(error),
      )
    })
    const reply = replySchema.parse(JSON.parse(await readFile(output, 'utf8')))
    return error === null || !reply.ok ? reply : {code: 'composer-attachment-failed', ok: false}
  } catch {
    return {code: 'composer-attachment-failed', ok: false}
  } finally {
    await rm(directory, {force: true, recursive: true})
  }
}
