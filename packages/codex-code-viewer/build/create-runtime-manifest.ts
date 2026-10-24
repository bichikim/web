import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import {basename, dirname, join} from 'node:path'

interface CreateRuntimeManifestOptions {
  readonly archive: string
  readonly version: string
  readonly host: string
}

/** Writes the release URL and integrity of the separately distributed Claude runtime. */
export const createRuntimeManifest = async (
  options: CreateRuntimeManifestOptions,
): Promise<void> => {
  const bytes = await readFile(options.archive)
  const artifact = basename(options.archive)
  const tag = `code-viewer-runtime-v${options.version}`
  const manifest = {
    hosts: {
      [options.host]: {
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        url: `https://github.com/bichikim/web/releases/download/${tag}/${artifact}`,
      },
    },
    version: options.version,
  }
  await writeFile(
    join(dirname(options.archive), 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  )
}
