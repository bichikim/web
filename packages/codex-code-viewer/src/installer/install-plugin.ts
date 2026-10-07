import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {z} from 'zod'
import {runCodex} from './run-codex'

interface InstallPluginOptions {
  codex: string
  home: string
  version: string
}
const MARKETPLACE = 'winter-love-code-viewer-npm'
const listingSchema = z.object({installed: z.array(z.object({pluginId: z.string()}))})

/** Registers this version's npm source, installs it, then removes earlier Code Viewer installations. */
export const installPlugin = async (options: InstallPluginOptions): Promise<void> => {
  const listing = listingSchema.parse(
    JSON.parse(
      await runCodex({
        ...options,
        args: ['plugin', 'list', '--json'],
      }),
    ),
  )
  const root = join(options.home, 'marketplace-sources', MARKETPLACE)
  const path = join(root, '.agents/plugins/marketplace.json')
  const previousCatalog = await readFile(path, 'utf8').catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  })
  const catalog = {
    interface: {displayName: 'Code Viewer'},
    name: MARKETPLACE,
    plugins: [
      {
        category: 'Developer Tools',
        name: 'codex-code-viewer',
        policy: {authentication: 'ON_INSTALL', installation: 'AVAILABLE'},
        source: {
          package: '@winter-love/codex-code-viewer',
          registry: 'https://registry.npmjs.org',
          source: 'npm',
          version: options.version,
        },
      },
    ],
  }
  await mkdir(dirname(path), {recursive: true})
  await writeFile(path, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  try {
    await runCodex({...options, args: ['plugin', 'marketplace', 'add', root, '--json']})
    await runCodex({
      ...options,
      args: ['plugin', 'add', `codex-code-viewer@${MARKETPLACE}`, '--json'],
    })
  } catch (error) {
    if (previousCatalog !== null) {
      await writeFile(path, previousCatalog, 'utf8')
    }
    throw error
  }
  const previous = listing.installed.filter(({pluginId}) =>
    ['codex-code-viewer@winter-love-plugins', 'codex-code-viewer@winter-love-code-viewer'].includes(
      pluginId,
    ),
  )
  // Codex commands write the same configuration; run removals in sequence.
  await previous.reduce(async (pending, plugin) => {
    await pending
    await runCodex({...options, args: ['plugin', 'remove', plugin.pluginId, '--json']})
  }, Promise.resolve())
}
