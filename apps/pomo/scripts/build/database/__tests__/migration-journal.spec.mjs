/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {neon} from '@neondatabase/serverless'

import {getLastAppliedAt} from '../migration-journal.mjs'

vi.mock('@neondatabase/serverless', () => ({neon: vi.fn()}))

describe('getLastAppliedAt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the last recorded migration time', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{journal: 'drizzle.__drizzle_migrations'}])
      .mockResolvedValueOnce([{lastAppliedAt: '1789906279111'}])
    vi.mocked(neon).mockReturnValue(query)

    await expect(getLastAppliedAt('postgresql://example')).resolves.toBe(1789906279111)
    expect(neon).toHaveBeenCalledWith('postgresql://example', {readOnly: true})
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('should treat a missing journal as no applied migrations', async () => {
    const query = vi.fn().mockResolvedValue([{journal: null}])
    vi.mocked(neon).mockReturnValue(query)

    await expect(getLastAppliedAt('postgresql://example')).resolves.toBe(0)
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('should treat an empty journal as no applied migrations', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{journal: 'drizzle.__drizzle_migrations'}])
      .mockResolvedValueOnce([{lastAppliedAt: null}])
    vi.mocked(neon).mockReturnValue(query)

    await expect(getLastAppliedAt('postgresql://example')).resolves.toBe(0)
  })

  it('should propagate database query failures', async () => {
    const query = vi.fn().mockRejectedValue(new Error('database unavailable'))
    vi.mocked(neon).mockReturnValue(query)

    await expect(getLastAppliedAt('postgresql://example')).rejects.toThrow('database unavailable')
  })

  it('should propagate a failed migration timestamp query', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{journal: 'drizzle.__drizzle_migrations'}])
      .mockRejectedValueOnce(new Error('journal query failed'))
    vi.mocked(neon).mockReturnValue(query)

    await expect(getLastAppliedAt('postgresql://example')).rejects.toThrow('journal query failed')
  })
})
