/** @vitest-environment jsdom */
import {PGlite} from '@electric-sql/pglite'
import {MemoryRouter, query} from '@solidjs/router'
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {drizzle} from 'drizzle-orm/pglite'
import {Blob, File} from 'node:buffer'
import migration from '../../../../drizzle/0019_mature_arachne.sql?raw'
import {afterAll, afterEach, beforeAll, beforeEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'

const mocks = vi.hoisted(() => ({
  authorizeAdminRequest: vi.fn(),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
vi.mock('src/server/auth/authorize-admin-request', () => ({
  authorizeAdminRequest: mocks.authorizeAdminRequest,
}))
vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('src/server/database', async () => ({
  ...(await import('src/server/database/schema')),
  getDatabase: mocks.getDatabase,
  withTransactionalDatabase: mocks.withTransactionalDatabase,
}))

import {invokeApiRoute} from 'src/routes/api/__tests__/invoke'
import {GET} from 'src/routes/api/admin/feature-requests'
import {PATCH} from 'src/routes/api/admin/feature-requests/[requestId]/status'
import {listAdminFeatureRequests} from 'src/server/repositories/feature-requests'
import {AdminFeatureRequests} from '../AdminFeatureRequests'

let database: PGlite
const ownerId = '019d0000-0000-7000-8000-000000000001'
const reads: Array<number> = []
const writes: Array<unknown> = []

beforeAll(async () => {
  vi.stubGlobal('Blob', Blob)
  vi.stubGlobal('File', File)
  database = new PGlite()
  await database.exec('create table pomo_users (id uuid primary key)')
  await database.exec(migration)
  await database.query('insert into pomo_users values ($1)', [ownerId])
  const repository = drizzle(database, {casing: 'snake_case'})
  mocks.getDatabase.mockReturnValue(repository)
  mocks.withTransactionalDatabase.mockImplementation((operation) => operation(repository))
})

beforeEach(async () => {
  query.clear()
  reads.length = 0
  writes.length = 0
  mocks.authorizeAdminRequest.mockResolvedValue({authorized: true, cookies: []})
  await database.exec('truncate feature_requests cascade')
  await database.query(
    `insert into feature_requests (id, user_id, title, description, created_at)
     select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
            $1, '요청 ' || n, '정상 기능 요청', '2026-11-01'::timestamptz - n * interval '1 minute'
     from generate_series(1, 21) as n`,
    [ownerId],
  )
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost')
    const request = new Request(url, init)
    if (request.method === 'GET' && url.pathname === '/api/admin/feature-requests') {
      reads.push(Number(url.searchParams.get('offset') ?? 0))
      return invokeApiRoute(GET, request)
    }
    const match = /^\/api\/admin\/feature-requests\/([^/]+)\/status$/.exec(url.pathname)
    if (request.method === 'PATCH' && match !== null) {
      writes.push(await request.clone().json())
      return invokeApiRoute(PATCH, request, {requestId: match[1]!})
    }
    throw new Error(`Unexpected request: ${request.method} ${url.pathname}`)
  })
})

afterEach(() => {
  cleanup()
  query.clear()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

afterAll(() => database.close())

it.each([21, 61])(
  'should reveal unseen requests after a status save among %i rows',
  async (total) => {
    if (total > 21) {
      await database.query(
        `insert into feature_requests (id, user_id, title, description, created_at)
       select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
              $1, '요청 ' || n, '정상 기능 요청', '2026-11-01'::timestamptz - n * interval '1 minute'
       from generate_series(22, $2::integer) as n`,
        [ownerId, total],
      )
    }
    const loadedCount = total === 21 ? 20 : 40
    const initial = await listAdminFeatureRequests()
    expect(initial.requests.map((request) => request.title)).toEqual(
      Array.from({length: 20}, (_, index) => `요청 ${index + 1}`),
    )
    expect(initial.hasMore).toBe(true)
    render(() => <MemoryRouter root={AdminFeatureRequests} />)
    await screen.findByRole('heading', {name: '요청 20'})
    if (loadedCount === 40) {
      fireEvent.click(await screen.findByRole('button', {name: m.feature_request_load_more()}))
      await screen.findByRole('heading', {name: '요청 40'})
    }
    const first = screen.getByRole('heading', {name: '요청 1'}).closest('article')!
    fireEvent.click(within(first).getByRole('button', {name: m.feature_request_status_completed()}))
    fireEvent.click(within(first).getByRole('button', {name: m.admin_feature_request_approve()}))
    await within(first).findByRole('button', {name: m.admin_feature_request_save()})
    expect(writes).toEqual([{status: 'completed', targetVoteCount: null}])
    expect(reads).toEqual(loadedCount === 20 ? [0] : [0, 20])
    expect(screen.getAllByRole('article')).toHaveLength(loadedCount)
    const reordered = await listAdminFeatureRequests()
    expect(reordered.requests.map((request) => request.title)).toEqual(
      Array.from({length: 20}, (_, index) => `요청 ${index + 2}`),
    )
    expect((await listAdminFeatureRequests({offset: total - 1})).requests).toMatchObject([
      {status: 'completed', title: '요청 1'},
    ])
    fireEvent.click(await screen.findByRole('button', {name: m.feature_request_load_more()}))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(loadedCount + 1))
    expect(screen.getByRole('heading', {name: `요청 ${loadedCount + 1}`})).toBeVisible()
    if (total > loadedCount + 1) {
      fireEvent.click(await screen.findByRole('button', {name: m.feature_request_load_more()}))
      await screen.findByRole('heading', {name: `요청 ${total}`})
    }
    fireEvent.click(await screen.findByRole('button', {name: m.feature_request_load_more()}))
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {name: m.feature_request_loading_more()}),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', {name: m.feature_request_load_more()}),
      ).not.toBeInTheDocument()
    })
    expect(reads).toEqual(total === 21 ? [0, 0, 20] : [0, 20, 0, 20, 40, 60])
    expect(screen.getAllByRole('article')).toHaveLength(total)
    expect(screen.getAllByRole('article')[0]).toBe(first)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  },
)
