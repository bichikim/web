import {type ChildProcessWithoutNullStreams, spawn} from 'node:child_process'
import {addAbortListener, once} from 'node:events'
import {mkdir, mkdtemp, realpath, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

export interface CreatePreviewOptions {
  /** Existing workspace to read; omitted workspaces are created and removed by the fixture. */
  readonly workspace?: string
  /** Files created before startup, relative to the fixture's owned workspace; omitted means no files. */
  readonly files?: Readonly<Record<string, string | Uint8Array>>
}
export interface Preview {
  readonly child: ChildProcessWithoutNullStreams
  readonly directory: string
  readonly workspace: string
  readonly url: string
  close(): Promise<void>
}

const LOG_TAIL_BYTES = 8192
const STARTUP_DEADLINE_MS = 15000
const CLOSE_DEADLINE_MS = 5000

const previewAddress = async (child: ChildProcessWithoutNullStreams): Promise<string> => {
  const ready = Promise.withResolvers<string>()
  let output = ''
  let errors = ''
  const read = (data: Buffer): void => {
    output = (output + data.toString()).slice(-LOG_TAIL_BYTES)
    const address = /Code Viewer preview: (?<url>http:\/\/\S+)/u.exec(output)?.groups?.url
    if (address !== undefined) {
      ready.resolve(address)
    }
  }
  const fail = (error: Error): void => ready.reject(error)
  const exit = (): void => fail(new Error(`Preview exited before startup: ${errors}`))
  const record = (data: Buffer): void => {
    errors = (errors + data.toString()).slice(-LOG_TAIL_BYTES)
  }
  child.stdout.on('data', read)
  child.stderr.on('data', record)
  child.once('error', fail)
  child.once('exit', exit)
  const deadline = addAbortListener(AbortSignal.timeout(STARTUP_DEADLINE_MS), () =>
    fail(new Error(`Preview startup deadline: ${errors}`)),
  )
  try {
    return await ready.promise
  } finally {
    child.stdout.off('data', read)
    child.stderr.off('data', record)
    child.off('error', fail)
    child.off('exit', exit)
    deadline[Symbol.dispose]()
    child.stdout.resume()
    child.stderr.resume()
  }
}

/** Owns a real preview and bundled MCP server with an isolated chat profile until close. */
export const createPreview = async (options: CreatePreviewOptions = {}): Promise<Preview> => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'viewer-e2e-')))
  const workspace = options.workspace ?? join(directory, 'workspace')
  await mkdir(workspace, {recursive: true})
  if (options.workspace === undefined) {
    await mkdir(join(workspace, '.git'))
    await Promise.all(
      Object.entries(options.files ?? {}).map(async ([name, content]) => {
        const path = join(workspace, name)
        await mkdir(dirname(path), {recursive: true})
        await writeFile(path, content)
      }),
    )
  }
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const child = spawn(
    process.execPath,
    ['--import', import.meta.resolve('tsx'), join(root, 'preview.ts'), workspace, '--panel'],
    {cwd: root, env: {...process.env, CODEX_HOME: join(directory, 'home')}, stdio: 'pipe'},
  )
  const closed = new Promise<void>((resolve) => {
    child.once('close', () => resolve())
  })
  let stopping: Promise<void> | undefined
  const close = (): Promise<void> => {
    stopping ??= (async () => {
      if (child.exitCode === null && child.signalCode === null) {
        const ended = once(child, 'close', {signal: AbortSignal.timeout(CLOSE_DEADLINE_MS)})
        child.kill('SIGINT')
        await ended.catch(() => child.kill('SIGKILL'))
      }
      await closed
      await rm(directory, {force: true, recursive: true})
    })()
    return stopping
  }
  try {
    return {child, close, directory, url: await previewAddress(child), workspace}
  } catch (error) {
    await close()
    throw error
  }
}
