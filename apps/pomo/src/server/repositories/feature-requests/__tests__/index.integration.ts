/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {readFile} from 'node:fs/promises'
import {afterAll, beforeAll, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))
vi.mock('src/server/database', async () => ({
  ...(await import('src/server/database/schema')),
  ...mocks,
}))

import {
  createFeatureRequest,
  listAdminFeatureRequests,
  listFeatureRequests,
  updateFeatureRequestStatus,
  voteFeatureRequest,
} from '..'

const database = new PGlite()
const ownerId = '019d0000-0000-7000-8000-000000000001'
const visitorId = '019d0000-0000-7000-8000-000000000002'

beforeAll(async () => {
  await database.exec('create table pomo_users (id uuid primary key)')
  const migration = await readFile(
    new URL('../../../../../drizzle/0019_mature_arachne.sql', import.meta.url),
    'utf8',
  )
  await database.exec(migration)
  await database.query('insert into pomo_users values ($1), ($2)', [ownerId, visitorId])
  const repository = drizzle(database, {casing: 'snake_case'})
  mocks.getDatabase.mockReturnValue(repository)
  mocks.withTransactionalDatabase.mockImplementation((operation) => operation(repository))
})

beforeEach(async () => {
  await database.exec('truncate feature_requests cascade')
})

afterAll(async () => {
  await database.close()
})

const submitRequest = () =>
  createFeatureRequest({
    description: '집중 기록을 보고 싶어요.',
    title: '집중 통계',
    userId: ownerId,
  })

it('should keep a newly submitted request private to its author and administrators', async () => {
  const {id} = await submitRequest()
  expect((await listFeatureRequests(ownerId)).requests).toMatchObject([{id, status: 'requested'}])
  expect(await listFeatureRequests(visitorId)).toEqual({hasMore: false, requests: []})
  expect(await listFeatureRequests(null)).toEqual({hasMore: false, requests: []})
  expect((await listAdminFeatureRequests()).requests).toMatchObject([{id, status: 'requested'}])
})

it('should block votes on a pending request even when its id is known', async () => {
  const {id} = await submitRequest()
  expect(await voteFeatureRequest(id, visitorId)).toEqual({status: 'not-found'})
  expect(await voteFeatureRequest(id, ownerId)).toEqual({status: 'closed'})
  expect((await listAdminFeatureRequests()).requests[0]?.voteCount).toBe(0)
})

it('should keep a request private when approval has no vote goal', async () => {
  const {id} = await submitRequest()
  expect(await updateFeatureRequestStatus({requestId: id, status: 'voting'})).toEqual({
    code: 'feature_request_target_required',
    success: false,
  })
  expect((await listFeatureRequests(null)).requests).toEqual([])
  expect((await listAdminFeatureRequests()).requests).toMatchObject([{id, status: 'requested'}])
})

it('should publish an approved request and accept one vote per user', async () => {
  const {id} = await submitRequest()
  expect(
    await updateFeatureRequestStatus({requestId: id, status: 'voting', targetVoteCount: 10}),
  ).toEqual({success: true})
  expect((await listFeatureRequests(null)).requests).toMatchObject([
    {id, status: 'voting', targetVoteCount: 10},
  ])
  expect((await listFeatureRequests(visitorId)).requests).toMatchObject([{id, status: 'voting'}])
  expect(await voteFeatureRequest(id, visitorId)).toEqual({status: 'voted'})
  expect(await voteFeatureRequest(id, visitorId)).toEqual({status: 'already-voted'})
  expect((await listFeatureRequests(visitorId)).requests).toMatchObject([
    {id, voteCount: 1, votedByCurrentUser: true},
  ])
})

it('should paginate visible requests without counting other authors pending requests', async () => {
  const {id: pendingId} = await submitRequest()
  const {id: publicId} = await submitRequest()
  await updateFeatureRequestStatus({requestId: publicId, status: 'completed'})
  expect(await listFeatureRequests(visitorId, {limit: 1})).toMatchObject({
    hasMore: false,
    requests: [{id: publicId}],
  })
  expect(await listFeatureRequests(ownerId, {limit: 1})).toMatchObject({
    hasMore: true,
    requests: [{id: pendingId}],
  })
  expect(await listAdminFeatureRequests({limit: 1})).toMatchObject({
    hasMore: true,
    requests: [{id: pendingId}],
  })
  expect(await listFeatureRequests(ownerId, {limit: 1, offset: 1})).toMatchObject({
    hasMore: false,
    requests: [{id: publicId}],
  })
})

it.each(['confirmed', 'completed'] as const)(
  'should keep a %s request public and close its voting',
  async (status) => {
    const {id} = await submitRequest()
    await updateFeatureRequestStatus({requestId: id, status, targetVoteCount: 10})
    expect((await listFeatureRequests(null)).requests).toMatchObject([{id, status}])
    expect(await voteFeatureRequest(id, visitorId)).toEqual({status: 'closed'})
  },
)

it('should hide a published request again when an administrator returns it to review', async () => {
  const {id} = await submitRequest()
  await updateFeatureRequestStatus({requestId: id, status: 'voting', targetVoteCount: 10})
  await voteFeatureRequest(id, visitorId)
  await updateFeatureRequestStatus({requestId: id, status: 'requested'})
  expect((await listFeatureRequests(null)).requests).toEqual([])
  expect((await listFeatureRequests(visitorId)).requests).toEqual([])
  expect((await listFeatureRequests(ownerId)).requests).toMatchObject([
    {id, status: 'requested', targetVoteCount: null},
  ])
  expect(await voteFeatureRequest(id, visitorId)).toEqual({status: 'not-found'})
})
