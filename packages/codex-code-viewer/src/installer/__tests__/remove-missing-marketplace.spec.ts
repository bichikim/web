/** @vitest-environment node */
import {statSync} from 'node:fs'
import {stat} from 'node:fs/promises'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {removeMissingMarketplace} from '../remove-missing-marketplace'
import {runCodex} from '../run-codex'

vi.mock('node:fs/promises', () => ({stat: vi.fn()}))
vi.mock('../run-codex', () => ({runCodex: vi.fn()}))
const options = {codex: 'codex', home: '/codex', marketplace: 'viewer'}
const source = {source: '/missing/viewer', source_type: 'local'} as const
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(stat).mockResolvedValue(statSync(new URL(import.meta.url)))
})

describe('removeMissingMarketplace', () => {
  it.each(['ENOENT', 'ENOTDIR'])(
    'should unregister a confirmed missing source (%s)',
    async (code) => {
      vi.mocked(stat).mockRejectedValue(Object.assign(new Error('missing'), {code}))
      await removeMissingMarketplace({...options, source})
      expect(runCodex).toHaveBeenCalledExactlyOnceWith({
        args: ['plugin', 'marketplace', 'remove', 'viewer', '--json'],
        codex: 'codex',
        home: '/codex',
      })
    },
  )

  it('should retain an existing local source', async () => {
    await removeMissingMarketplace({...options, source})
    expect(stat).toHaveBeenCalledExactlyOnceWith('/missing/viewer')
    expect(runCodex).not.toHaveBeenCalled()
  })

  it('should retain a source whose existence cannot be checked', async () => {
    const error = Object.assign(new Error('denied'), {code: 'EACCES'})
    vi.mocked(stat).mockRejectedValue(error)
    await expect(removeMissingMarketplace({...options, source})).rejects.toBe(error)
    expect(runCodex).not.toHaveBeenCalled()
  })

  it('should leave absent registrations alone', async () => {
    await removeMissingMarketplace({...options, source: undefined})
    expect(stat).not.toHaveBeenCalled()
    expect(runCodex).not.toHaveBeenCalled()
  })

  it('should leave Git registrations alone', async () => {
    await removeMissingMarketplace({
      ...options,
      source: {source: 'https://example.com/viewer.git', source_type: 'git'},
    })
    expect(stat).not.toHaveBeenCalled()
    expect(runCodex).not.toHaveBeenCalled()
  })
})
