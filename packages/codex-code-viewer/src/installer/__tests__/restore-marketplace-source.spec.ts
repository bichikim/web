/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {restoreMarketplaceSource} from '../restore-marketplace-source'
import {runCodex} from '../run-codex'

vi.mock('../run-codex', () => ({runCodex: vi.fn()}))
const options = {codex: 'codex', home: '/codex', marketplace: 'viewer'}
beforeEach(() => vi.resetAllMocks())

describe('restoreMarketplaceSource', () => {
  it('should unregister a marketplace with no previous source', async () => {
    await restoreMarketplaceSource({...options, source: undefined})
    expect(runCodex).toHaveBeenCalledExactlyOnceWith({
      args: ['plugin', 'marketplace', 'remove', 'viewer', '--json'],
      codex: 'codex',
      home: '/codex',
    })
  })

  it('should restore a local marketplace source', async () => {
    await restoreMarketplaceSource({
      ...options,
      source: {source: '/previous', source_type: 'local'},
    })
    expect(runCodex).toHaveBeenCalledExactlyOnceWith({
      args: ['plugin', 'marketplace', 'add', '/previous', '--json'],
      codex: 'codex',
      home: '/codex',
    })
  })

  it('should restore a Git marketplace with its ref and every sparse path', async () => {
    await restoreMarketplaceSource({
      ...options,
      source: {
        ref: 'dev',
        source: 'https://example.com/plugins.git',
        source_type: 'git',
        sparse_paths: ['plugins', 'assets'],
      },
    })
    expect(runCodex).toHaveBeenCalledExactlyOnceWith({
      args: [
        'plugin',
        'marketplace',
        'add',
        'https://example.com/plugins.git',
        '--ref',
        'dev',
        '--sparse',
        'plugins',
        '--sparse',
        'assets',
        '--json',
      ],
      codex: 'codex',
      home: '/codex',
    })
  })

  it('should restore a Git marketplace without optional selectors', async () => {
    await restoreMarketplaceSource({
      ...options,
      source: {source: 'https://example.com/plugins.git', source_type: 'git'},
    })
    expect(runCodex).toHaveBeenCalledExactlyOnceWith({
      args: ['plugin', 'marketplace', 'add', 'https://example.com/plugins.git', '--json'],
      codex: 'codex',
      home: '/codex',
    })
  })

  it('should propagate a restoration failure', async () => {
    vi.mocked(runCodex).mockRejectedValue(new Error('restoration failed'))
    await expect(restoreMarketplaceSource({...options, source: undefined})).rejects.toThrow(
      'restoration failed',
    )
  })
})
