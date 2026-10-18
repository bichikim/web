import {readdir, readFile, stat} from 'node:fs/promises'
import {join} from 'node:path'
import type {Zippable} from 'fflate'

interface RuntimeOptions {
  readonly output: string
  readonly platform: string
  readonly architecture: string
  readonly entrypoints: readonly string[]
}
const ZIP_MODE_MULTIPLIER = 65_536
export const readArchiveEntry = async (path: string): Promise<Zippable[string]> => [
  await readFile(path),
  {attrs: (await stat(path)).mode * ZIP_MODE_MULTIPLIER, os: 3},
]

export const readArchiveDirectory = async (directory: string): Promise<Zippable> =>
  Object.fromEntries(
    await Promise.all(
      (await readdir(directory, {withFileTypes: true})).map(async (entry) => {
        const path = join(directory, entry.name)
        return [
          entry.name,
          entry.isDirectory() ? await readArchiveDirectory(path) : await readArchiveEntry(path),
        ]
      }),
    ),
  )

/** Collects runtime assets and the analyzer for the requested host, excluding download caches. */
export const collectRuntime = async (options: RuntimeOptions): Promise<Zippable> => {
  const runtime: Zippable = Object.fromEntries(
    await Promise.all(
      [
        ...options.entrypoints,
        'navigation-worker.js',
        'pdf.worker.js',
        'app.html',
        'THIRD_PARTY_LICENSES.md',
        ...(await readdir(options.output)).filter(
          (file) => file.startsWith('lib.') && file.endsWith('.d.ts'),
        ),
      ].map(async (file) => [file, await readFile(join(options.output, file))]),
    ),
  )
  const host = `${options.platform}-${options.architecture}`
  const binary = options.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer'
  const modulesDirectory = 'node_modules'
  const rendererDirectory = join(options.output, modulesDirectory, '@napi-rs')
  const renderers = Object.fromEntries(
    await Promise.all(
      (await readdir(rendererDirectory))
        .filter((name) => name === 'canvas' || name.startsWith(`canvas-${host}`))
        .map(async (name) => [name, await readArchiveDirectory(join(rendererDirectory, name))]),
    ),
  )
  return {
    ...runtime,
    [modulesDirectory]: {'@napi-rs': renderers},
    'pdf-assets': await readArchiveDirectory(join(options.output, 'pdf-assets')),
    python: await readArchiveDirectory(join(options.output, 'python')),
    rust: {[host]: {[binary]: await readArchiveEntry(join(options.output, 'rust', host, binary))}},
  }
}
