import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {unzipSync} from 'fflate'

/** Stages the real Pane SDK suite; returned starts each own and drain their process through completion. */
export const createSdkLoad = async (directory: string) => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const {version}: {version: string} = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  )
  const archive = unzipSync(
    await readFile(
      join(
        root,
        'dist',
        `code-viewer-${version}-claude-code-${process.platform}-${process.arch}.zip`,
      ),
    ),
    {
      filter: ({name}) => name.startsWith('hooks/') || name === '.claude-plugin/plugin.json',
    },
  )
  const plugin = join(directory, 'sdk')
  for (const [name, content] of Object.entries(archive)) {
    if (!name.endsWith('/')) {
      const target = join(plugin, name)
      // oxlint-disable-next-line no-await-in-loop -- Archive entries are staged before any test process starts.
      await mkdir(dirname(target), {recursive: true})
      // oxlint-disable-next-line no-await-in-loop -- Finish staging each owned archive entry before starting the suite.
      await writeFile(target, content)
    }
  }
  await writeFile(join(plugin, 'hooks/register.js'), archive['hooks/register-pane.js']!)
  const tests = join(root, 'claude/code/hooks/__tests__')
  const output = join(plugin, 'hooks/__tests__')
  await mkdir(output, {recursive: true})
  await Promise.all(
    (await readdir(tests))
      .filter(
        (name) =>
          name.endsWith('.ts') && !name.endsWith('.spec.ts') && name !== 'register.browser.test.ts',
      )
      .map(async (name) => writeFile(join(output, name), await readFile(join(tests, name)))),
  )
  return async () => {
    const started = process.hrtime.bigint()
    const child = spawn(process.env.CLAUDE_BINARY ?? 'claude', ['plugin', 'test', plugin], {
      env: {...process.env, CLAUDE_CONFIG_DIR: join(directory, 'profile')},
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const SDK_DEADLINE_MS = 45000
    const NANOSECONDS = 1000000
    const closed = once(child, 'close', {signal: AbortSignal.timeout(SDK_DEADLINE_MS)})
    closed.catch(() => child.kill('SIGKILL'))
    const chunks: string[] = []
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk.toString()))
    await once(child, 'spawn')
    return {
      close: () => child.kill('SIGTERM'),
      pid: child.pid,
      result: closed.then(([code]) => ({
        code,
        milliseconds: Number(process.hrtime.bigint() - started) / NANOSECONDS,
        output: chunks.join(''),
      })),
    }
  }
}
