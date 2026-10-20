import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {arch, platform} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'

interface ReadClaudeRuntimeOptions {
  readonly packageRoot: string
  readonly directory: string
  readonly version: string
  readonly archive?: string
}
const maximumBytes = 268_435_456
const runtimeSchema = z.object({
  bytes: z.number().int().positive().max(maximumBytes),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  url: z.url().refine((value) => new URL(value).protocol === 'https:'),
})
const manifestSchema = z.object({hosts: z.record(z.string(), runtimeSchema), version: z.string()})
const matches = (bytes: Uint8Array, runtime: z.infer<typeof runtimeSchema>): boolean =>
  bytes.length === runtime.bytes &&
  createHash('sha256').update(bytes).digest('hex') === runtime.sha256

const downloadRuntime = async (runtime: z.infer<typeof runtimeSchema>): Promise<Buffer> => {
  const response = await fetch(runtime.url)
  if (!response.ok || response.body === null) {
    throw new Error(`Claude runtime download failed (${response.status}): ${runtime.url}`)
  }
  const chunks: Uint8Array[] = []
  let received = 0
  for await (const chunk of response.body) {
    received += chunk.length
    if (received > runtime.bytes) {
      throw new Error('Claude runtime size or SHA-256 verification failed.')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** Reads a versioned host runtime, verifying its size and SHA-256 before use or caching. */
export const readClaudeRuntime = async (options: ReadClaudeRuntimeOptions): Promise<Uint8Array> => {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(options.packageRoot, 'dist/claude/manifest.json'), 'utf8')),
  )
  if (manifest.version !== options.version) {
    throw new Error('The Claude runtime manifest version does not match the installer.')
  }
  const host = `${platform()}-${arch()}`
  const runtime = manifest.hosts[host]
  if (runtime === undefined) {
    throw new Error(
      `No Claude runtime is available for ${host}. Currently supported: macOS Apple Silicon.`,
    )
  }
  const cached = join(options.directory, `${options.version}-${host}.zip`)
  const existing = await readFile(options.archive ?? cached).catch((error: unknown) => {
    if (
      options.archive === undefined &&
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return undefined
    }
    throw error
  })
  if (existing !== undefined && matches(existing, runtime)) {
    return existing
  }
  if (options.archive !== undefined) {
    throw new Error('The specified Claude runtime failed size or SHA-256 verification.')
  }
  const bytes = await downloadRuntime(runtime)
  if (!matches(bytes, runtime)) {
    throw new Error('Claude runtime size or SHA-256 verification failed.')
  }
  await mkdir(options.directory, {recursive: true})
  await writeFile(cached, bytes, {mode: 0o600})
  return bytes
}
