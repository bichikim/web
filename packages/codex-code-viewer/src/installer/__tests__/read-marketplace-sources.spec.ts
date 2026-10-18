/** @vitest-environment node */
import {readFile} from 'node:fs/promises'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {readMarketplaceSources} from '../read-marketplace-sources'

vi.mock('node:fs/promises', () => ({readFile: vi.fn()}))

const options = {home: '/codex', marketplaces: ['npm', 'development']}
beforeEach(() => vi.resetAllMocks())

describe('readMarketplaceSources', () => {
  it('should read selected local and Git registrations from one configuration snapshot', async () => {
    vi.mocked(readFile).mockResolvedValue(
      [
        '[marketplaces.npm]',
        'source_type = "local"',
        'source = "/npm"',
        '[marketplaces.development]',
        'source_type = "git"',
        'source = "https://example.com/plugins.git"',
        'ref = "dev"',
        'sparse_paths = ["plugins", "assets"]',
        '[marketplaces.unrelated]',
        'source_type = "future"',
      ].join('\n'),
    )
    expect([...(await readMarketplaceSources(options))]).toEqual([
      ['npm', {source: '/npm', source_type: 'local'}],
      [
        'development',
        {
          ref: 'dev',
          source: 'https://example.com/plugins.git',
          source_type: 'git',
          sparse_paths: ['plugins', 'assets'],
        },
      ],
    ])
    expect(readFile).toHaveBeenCalledExactlyOnceWith('/codex/config.toml', 'utf8')
  })

  it('should return no registrations when the configuration is absent', async () => {
    vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('missing'), {code: 'ENOENT'}))
    expect((await readMarketplaceSources(options)).size).toBe(0)
  })

  it('should return no registrations when the configuration has no marketplaces', async () => {
    vi.mocked(readFile).mockResolvedValue('model = "example"')
    expect((await readMarketplaceSources(options)).size).toBe(0)
  })

  it('should propagate a configuration permission error', async () => {
    const error = Object.assign(new Error('denied'), {code: 'EACCES'})
    vi.mocked(readFile).mockRejectedValue(error)
    await expect(readMarketplaceSources(options)).rejects.toBe(error)
  })

  it('should reject malformed configuration instead of treating it as a new installation', async () => {
    vi.mocked(readFile).mockResolvedValue('[marketplaces.npm')
    await expect(readMarketplaceSources(options)).rejects.toThrow()
  })

  it('should reject an unsupported selected source instead of losing its registration', async () => {
    vi.mocked(readFile).mockResolvedValue(
      '[marketplaces.npm]\nsource_type = "future"\nsource = "/example"',
    )
    await expect(readMarketplaceSources(options)).rejects.toThrow()
  })
})
