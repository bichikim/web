/** @vitest-environment jsdom */

import {query} from '@solidjs/router'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  adminFeatureRequestsQuery,
  featureRequestsQuery,
  invalidateFeatureRequestPages,
} from '../page-query'
import type {FeatureRequestPage} from '../types'

const fetchMock = vi.fn<typeof fetch>()
const createPage = (title: string): FeatureRequestPage => ({
  hasMore: true,
  requests: [
    {
      createdAt: '2026-10-01T00:00:00Z',
      description: 'Feature request description',
      id: '00000000-0000-4000-8000-000000000001',
      status: 'requested',
      targetVoteCount: null,
      title,
      voteCount: 0,
      votedByCurrentUser: false,
    },
  ],
})
const queryCases = [
  {name: 'featureRequestsQuery', pageQuery: featureRequestsQuery, path: '/api/feature-requests'},
  {
    name: 'adminFeatureRequestsQuery',
    pageQuery: adminFeatureRequestsQuery,
    path: '/api/admin/feature-requests',
  },
] as const

beforeEach(() => {
  query.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'false')
})

afterEach(() => {
  query.clear()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe.each(queryCases)('$name', ({pageQuery, path}) => {
  it('should deduplicate concurrent requests and reuse the resolved page for the same key', async () => {
    const response = Promise.withResolvers<Response>()
    const page = createPage('Shared page')
    fetchMock.mockReturnValueOnce(response.promise)

    const first = pageQuery('user-1', 12)
    const second = pageQuery('user-1', 12)
    response.resolve(Response.json(page))

    const results = await Promise.all([first, second])
    expect(results).toEqual([page, page])
    expect(await pageQuery('user-1', 12)).toEqual(page)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${path}?offset=12`,
      expect.objectContaining({credentials: 'include'}),
    )
  })

  it('should isolate pages by offset and authentication scope', async () => {
    const firstPage = createPage('User one first page')
    const laterPage = createPage('User one later page')
    const otherUserPage = createPage('User two first page')
    fetchMock
      .mockResolvedValueOnce(Response.json(firstPage))
      .mockResolvedValueOnce(Response.json(laterPage))
      .mockResolvedValueOnce(Response.json(otherUserPage))

    const readPages = () =>
      Promise.all([pageQuery('user-1', 0), pageQuery('user-1', 12), pageQuery('user-2', 0)])

    expect(await readPages()).toEqual([firstPage, laterPage, otherUserPage])
    expect(await readPages()).toEqual([firstPage, laterPage, otherUserPage])
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([path, `${path}?offset=12`, path])
  })
})

describe('query identities', () => {
  it('should keep public and administrator pages separate for the same scope and offset', async () => {
    const publicPage = createPage('Public page')
    const adminPage = createPage('Administrator page')
    fetchMock
      .mockResolvedValueOnce(Response.json(publicPage))
      .mockResolvedValueOnce(Response.json(adminPage))

    expect(await featureRequestsQuery('user-1', 12)).toEqual(publicPage)
    expect(await adminFeatureRequestsQuery('user-1', 12)).toEqual(adminPage)
    expect(await featureRequestsQuery('user-1', 12)).toEqual(publicPage)
    expect(await adminFeatureRequestsQuery('user-1', 12)).toEqual(adminPage)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/feature-requests?offset=12',
      '/api/admin/feature-requests?offset=12',
    ])
  })
})

describe('invalidateFeatureRequestPages', () => {
  it('should fetch fresh first and later pages for both lists and every cached scope', async () => {
    const originalPage = createPage('Before mutation')
    const updatedPage = createPage('After mutation')
    fetchMock.mockImplementation(async () => Response.json(originalPage))
    const pageCalls = queryCases.flatMap(({pageQuery, path}) =>
      ['user-1', 'user-2'].flatMap((scope) =>
        [0, 12, 24].map((offset) => ({
          read: () => pageQuery(scope, offset),
          url: offset === 0 ? path : `${path}?offset=${offset}`,
        })),
      ),
    )
    const readPages = () => Promise.all(pageCalls.map(({read}) => read()))

    expect(await readPages()).toEqual(pageCalls.map(() => originalPage))
    fetchMock.mockImplementation(async () => Response.json(updatedPage))
    expect(await readPages()).toEqual(pageCalls.map(() => originalPage))
    expect(fetchMock).toHaveBeenCalledTimes(pageCalls.length)

    await invalidateFeatureRequestPages()

    expect(await readPages()).toEqual(pageCalls.map(() => updatedPage))
    expect(await readPages()).toEqual(pageCalls.map(() => updatedPage))
    const pageUrls = pageCalls.map(({url}) => url)
    expect(fetchMock.mock.calls.map(([url]) => url).toSorted()).toEqual(
      [...pageUrls, ...pageUrls].toSorted(),
    )
  })

  it.each([
    {body: '{}', kind: 'http', status: 401},
    {body: 'not-json', kind: 'parse', status: 200},
    {body: '{"hasMore":false,"requests":[{"id":"invalid"}]}', kind: 'schema', status: 200},
  ])('should retry a cached $kind failure after invalidation', async ({body, kind, status}) => {
    const recoveredPage = createPage('Recovered page')
    fetchMock
      .mockResolvedValueOnce(new Response(body, {status}))
      .mockResolvedValueOnce(Response.json(recoveredPage))

    await expect(featureRequestsQuery('user-1', 24)).rejects.toMatchObject({kind})
    await expect(featureRequestsQuery('user-1', 24)).rejects.toMatchObject({kind})
    expect(fetchMock).toHaveBeenCalledOnce()

    await invalidateFeatureRequestPages()

    expect(await featureRequestsQuery('user-1', 24)).toEqual(recoveredPage)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/feature-requests?offset=24',
      expect.any(Object),
    )
  })
})
