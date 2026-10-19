import {stat} from 'node:fs/promises'
import {runCodex, type RunCodexOptions} from './run-codex'
import type {MarketplaceSource} from './types'

interface RemoveMissingMarketplaceOptions extends Omit<RunCodexOptions, 'args'> {
  readonly marketplace: string
  readonly source: MarketplaceSource | undefined
}

/** Unregisters a local marketplace only when its source path no longer exists. */
export const removeMissingMarketplace = async (
  options: RemoveMissingMarketplaceOptions,
): Promise<void> => {
  const {marketplace, source, ...execution} = options
  if (source?.source_type !== 'local') {
    return
  }
  const missing = await stat(source.source).then(
    () => false,
    (error: unknown) => {
      if (
        error instanceof Error &&
        'code' in error &&
        (error.code === 'ENOENT' || error.code === 'ENOTDIR')
      ) {
        return true
      }
      throw error
    },
  )
  if (missing) {
    await runCodex({
      ...execution,
      args: ['plugin', 'marketplace', 'remove', marketplace, '--json'],
    })
  }
}
