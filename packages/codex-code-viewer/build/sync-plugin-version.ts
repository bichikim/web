import {readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {z} from 'zod'

interface SyncPluginVersionOptions {
  readonly marketplacePath: string
  readonly packageRoot: string
}

/** Updates plugin and npm marketplace versions from the package manifest, preserving other metadata. */
export const syncPluginVersion = async (options: SyncPluginVersionOptions): Promise<void> => {
  const pluginPath = join(options.packageRoot, '.codex-plugin/plugin.json')
  const [packageText, pluginText, marketplaceText] = await Promise.all([
    readFile(join(options.packageRoot, 'package.json'), 'utf8'),
    readFile(pluginPath, 'utf8'),
    readFile(options.marketplacePath, 'utf8'),
  ])
  const manifest = z.object({name: z.string(), version: z.string()}).parse(JSON.parse(packageText))
  const plugin = z.looseObject({name: z.string()}).parse(JSON.parse(pluginText))
  const catalog = z
    .looseObject({plugins: z.array(z.looseObject({name: z.string(), source: z.unknown()}))})
    .parse(JSON.parse(marketplaceText))
  const entry = catalog.plugins.find(({name}) => name === plugin.name)
  if (entry === undefined) {
    throw new Error(`Missing marketplace entry: ${plugin.name}`)
  }
  const source = z
    .looseObject({package: z.literal(manifest.name), source: z.literal('npm')})
    .parse(entry.source)
  const updated = {
    ...catalog,
    plugins: catalog.plugins.map((candidate) =>
      candidate === entry
        ? {...candidate, source: {...source, version: manifest.version}}
        : candidate,
    ),
  }
  await Promise.all([
    writeFile(pluginPath, `${JSON.stringify({...plugin, version: manifest.version}, null, 2)}\n`),
    writeFile(options.marketplacePath, `${JSON.stringify(updated, null, 2)}\n`),
  ])
}
