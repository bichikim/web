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
  stderr(): string
}

const LOG_TAIL_CODE_UNITS = 8192
const STARTUP_DEADLINE_MS = 15000
const CLOSE_DEADLINE_MS = 5000

const previewAddress = async (
  child: ChildProcessWithoutNullStreams,
): Promise<Pick<Preview, 'url' | 'stderr'>> => {
  const ready = Promise.withResolvers<string>()
  let output = ''
  let errors = ''
  const read = (data: string): void => {
    output = (output + data).slice(-LOG_TAIL_CODE_UNITS)
    const address = /Code Viewer preview: (?<url>http:\/\/\S+)\r?\n/u.exec(output)?.groups?.url
    if (address !== undefined && child.exitCode === null && child.signalCode === null) {
      ready.resolve(address)
    }
  }
  const fail = (error: Error): void => ready.reject(error)
  const failBeforeReady = (): void => fail(new Error(`Preview exited before startup: ${errors}`))
  const record = (data: string): void => {
    errors = (errors + data).slice(-LOG_TAIL_CODE_UNITS)
  }
  child.stdout.setEncoding('utf8').on('data', read)
  child.stderr.setEncoding('utf8').on('data', record)
  child.once('close', () => child.stderr.off('data', record))
  child.once('error', fail)
  child.once('close', failBeforeReady)
  const deadline = addAbortListener(AbortSignal.timeout(STARTUP_DEADLINE_MS), () =>
    fail(new Error(`Preview startup deadline: ${errors}`)),
  )
  try {
    return {stderr: () => errors, url: await ready.promise}
  } finally {
    child.stdout.off('data', read)
    child.off('error', fail)
    child.off('close', failBeforeReady)
    deadline[Symbol.dispose]()
    child.stdout.resume()
    child.stderr.resume()
  }
}

const prepareWorkspace = async (directory: string, options: CreatePreviewOptions) => {
  const workspace = options.workspace ?? join(directory, 'workspace')
  await mkdir(workspace, {recursive: true})
  if (options.workspace === undefined) {
    await mkdir(join(workspace, '.git'))
    const writes = await Promise.allSettled(
      Object.entries(options.files ?? {}).map(async ([name, content]) => {
        const path = join(workspace, name)
        await mkdir(dirname(path), {recursive: true})
        await writeFile(path, content)
      }),
    )
    const failures = writes.flatMap((write) => (write.status === 'rejected' ? [write.reason] : []))
    if (failures.length === 1) {
      throw failures[0]
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, 'Preview fixture files could not be written.')
    }
  }
  return workspace
}

/** Owns a real preview and bundled MCP server with an isolated chat profile until close. */
export const createPreview = async (options: CreatePreviewOptions = {}): Promise<Preview> => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'viewer-e2e-'))
  const removeDirectory = () => rm(temporaryDirectory, {force: true, recursive: true})
  let close = removeDirectory
  try {
    const directory = await realpath(temporaryDirectory)
    const workspace = await prepareWorkspace(directory, options)
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
    close = (): Promise<void> => {
      stopping ??= (async () => {
        if (child.exitCode === null && child.signalCode === null) {
          const ended = once(child, 'close', {signal: AbortSignal.timeout(CLOSE_DEADLINE_MS)})
          child.kill('SIGINT')
          await ended.catch(() => child.kill('SIGKILL'))
        }
        await closed
        await removeDirectory()
      })()
      return stopping
    }
    const address = await previewAddress(child)
    return {...address, child, close, directory, workspace}
  } catch (error) {
    try {
      await close()
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Preview startup and cleanup failed.')
    }
    throw error
  }
}
