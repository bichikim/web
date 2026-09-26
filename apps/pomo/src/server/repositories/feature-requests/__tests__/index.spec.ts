/** @vitest-environment node */

import {beforeEach, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('src/server/database', async () => {
  const actual = await vi.importActual<typeof import('src/server/database')>('src/server/database')

  return {...actual, getDatabase: databaseMocks.getDatabase}
})

import {listFeatureRequests} from '..'

const createRow = (index: number) => ({
  createdAt: new Date(`2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
  description: `설명 ${index}`,
  id: `request-${index}`,
  status: 'requested' as const,
  targetVoteCount: null,
  title: `기능 ${index}`,
  voteCount: index,
  votedByCurrentUser: false,
})

const select = vi.fn()
const limit = vi.fn()
const offset = vi.fn()
const database = {select}

beforeEach(() => {
  vi.clearAllMocks()
  databaseMocks.getDatabase.mockReturnValue(database)
})

it('should return one page and indicate when another page exists', async () => {
  const rows = Array.from({length: 21}, (_, index) => createRow(index))
  offset.mockResolvedValue(rows)
  limit.mockReturnValue({offset})
  select.mockReturnValue({
    from: vi.fn(() => ({
      orderBy: vi.fn(() => ({limit})),
    })),
  })

  const result = await listFeatureRequests(null)

  expect(result).toEqual({
    hasMore: true,
    requests: rows.slice(0, 20).map((row) => ({...row, createdAt: row.createdAt.toISOString()})),
  })
  expect(limit).toHaveBeenCalledWith(21)
  expect(offset).toHaveBeenCalledWith(0)
})

it('should apply an explicit page size and offset', async () => {
  const rows = [createRow(4), createRow(5), createRow(6)]
  offset.mockResolvedValue(rows)
  limit.mockReturnValue({offset})
  select.mockReturnValue({
    from: vi.fn(() => ({
      orderBy: vi.fn(() => ({limit})),
    })),
  })

  const result = await listFeatureRequests(null, {limit: 2, offset: 4})

  expect(result).toEqual({
    hasMore: true,
    requests: rows.slice(0, 2).map((row) => ({...row, createdAt: row.createdAt.toISOString()})),
  })
  expect(limit).toHaveBeenCalledWith(3)
  expect(offset).toHaveBeenCalledWith(4)
})
