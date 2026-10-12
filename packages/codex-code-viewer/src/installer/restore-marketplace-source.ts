import {runCodex, type RunCodexOptions} from './run-codex'
import type {MarketplaceSource} from './types'

interface RestoreMarketplaceSourceOptions extends Omit<RunCodexOptions, 'args'> {
  readonly marketplace: string
  readonly source: MarketplaceSource | undefined
}

/** Restores a prior local/Git registration, or unregisters a newly introduced marketplace. */
export const restoreMarketplaceSource = async (
  options: RestoreMarketplaceSourceOptions,
): Promise<void> => {
  const {marketplace, source, ...execution} = options
  if (source === undefined) {
    await runCodex({
      ...execution,
      args: ['plugin', 'marketplace', 'remove', marketplace, '--json'],
    })
    return
  }
  const selectors =
    source.source_type === 'git'
      ? [
          ...(source.ref === undefined ? [] : ['--ref', source.ref]),
          ...(source.sparse_paths ?? []).flatMap((path) => ['--sparse', path]),
        ]
      : []
  await runCodex({
    ...execution,
    args: ['plugin', 'marketplace', 'add', source.source, ...selectors, '--json'],
  })
}
