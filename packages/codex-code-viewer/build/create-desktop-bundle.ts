import {writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {strToU8, zipSync} from 'fflate'
import template from '../claude/manifest.json' with {type: 'json'}
import {collectRuntime} from './collect-runtime'

interface DesktopBundleOptions {
  readonly output: string
  readonly version: string
  readonly platform: string
  readonly architecture: string
}
/** Packages this build's runtime and native analyzer as a folder-scoped Claude Desktop extension. */
export const createDesktopBundle = async (options: DesktopBundleOptions): Promise<string> => {
  const manifest = {
    ...template,
    compatibility: {...template.compatibility, platforms: [options.platform]},
    version: options.version,
  }
  const runtime = await collectRuntime({...options, entrypoints: ['claude.js']})
  const host = `${options.platform}-${options.architecture}`
  const archive = zipSync({
    dist: runtime,
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'package.json': strToU8(
      JSON.stringify(
        {name: template.name, private: true, type: 'module', version: options.version},
        null,
        2,
      ),
    ),
  })
  const path = join(options.output, `code-viewer-${options.version}-${host}.mcpb`)
  await writeFile(path, archive)
  return path
}
