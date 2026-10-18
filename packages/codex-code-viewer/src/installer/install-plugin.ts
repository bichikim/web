import {mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {runCodex} from './run-codex'
import {resolvePreviousSource} from './resolve-previous-source'
import {readMarketplaceSources} from './read-marketplace-sources'
import {restoreMarketplaceSource} from './restore-marketplace-source'
import {removeMissingMarketplace} from './remove-missing-marketplace'

export type InstallStage = 'preparing' | 'registering' | 'installing' | 'cleaning' | 'restoring'

interface InstallPluginOptions {
  readonly codex: string
  readonly home: string
  readonly onProgress?: (stage: InstallStage) => void
  readonly onStderr?: (output: string) => void
  readonly version: string
}
const MARKETPLACE = 'winter-love-code-viewer-npm'

/** Registers this version's npm source, installs it, then removes earlier Code Viewer installations. */
export const installPlugin = async (options: InstallPluginOptions): Promise<void> => {
  options.onProgress?.('preparing')
  await mkdir(options.home, {recursive: true})
  const sources = await readMarketplaceSources({
    home: options.home,
    marketplaces: [MARKETPLACE, 'winter-love-code-viewer'],
  })
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
  let registered = false
  try {
    await mkdir(dirname(path), {recursive: true})
    await writeFile(path, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
    options.onProgress?.('registering')
    await runCodex({...options, args: ['plugin', 'marketplace', 'add', root, '--json']})
    registered = true
    options.onProgress?.('installing')
    await runCodex({
      ...options,
      args: ['plugin', 'add', `codex-code-viewer@${MARKETPLACE}`, '--json'],
    })
  } catch (error) {
    options.onProgress?.('restoring')
    try {
      if (previousCatalog === null) {
        await rm(path, {force: true})
      } else {
        await writeFile(path, previousCatalog, 'utf8')
      }
      if (registered) {
        await restoreMarketplaceSource({
          ...options,
          marketplace: MARKETPLACE,
          source: sources.get(MARKETPLACE),
        })
      }
    } catch (restoration) {
      const initial = error instanceof Error ? error.message : String(error)
      const detail = restoration instanceof Error ? restoration.message : String(restoration)
      throw new AggregateError(
        [error, restoration],
        `설치 실패 후 설정 복원도 실패했습니다: ${detail}\n최초 설치 오류: ${initial}`,
        {cause: error},
      )
    }
    throw error
  }
  options.onProgress?.('cleaning')
  const previousSource = resolvePreviousSource({
    catalog: previousCatalog,
    marketplace: MARKETPLACE,
    plugin: 'codex-code-viewer',
    root,
  })
  if (previousSource !== undefined) {
    await rm(previousSource, {force: true, recursive: true})
  }
  // Removal is idempotent and avoids loading unrelated marketplace manifests.
  await runCodex({
    ...options,
    args: ['plugin', 'remove', 'codex-code-viewer@winter-love-plugins', '--json'],
  })
  await runCodex({
    ...options,
    args: ['plugin', 'remove', 'codex-code-viewer@winter-love-code-viewer', '--json'],
  })
  await removeMissingMarketplace({
    ...options,
    marketplace: 'winter-love-code-viewer',
    source: sources.get('winter-love-code-viewer'),
  })
}
