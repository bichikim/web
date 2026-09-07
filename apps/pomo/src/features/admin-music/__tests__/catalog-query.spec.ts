import {query} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'

import {adminCatalogQuery} from '../catalog-query'

const emptyCatalog = {
  albums: [],
  assets: [],
  offers: [],
  pendingTracks: [],
  tracks: [],
} as const

afterEach(() => {
  query.clear()
  vi.unstubAllGlobals()
})

it('should load and validate the administrator catalog through the existing endpoint', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(emptyCatalog))
  vi.stubGlobal('fetch', fetchMock)

  await expect(adminCatalogQuery()).resolves.toEqual({catalog: emptyCatalog, status: 'ready'})
  expect(fetchMock).toHaveBeenCalledOnce()
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/music')
})

it('should deduplicate simultaneous catalog requests', async () => {
  const response = Promise.withResolvers<Response>()
  const fetchMock = vi.fn<typeof fetch>().mockReturnValueOnce(response.promise)
  vi.stubGlobal('fetch', fetchMock)

  const firstResult = adminCatalogQuery()
  const secondResult = adminCatalogQuery()
  response.resolve(Response.json(emptyCatalog))

  await expect(firstResult).resolves.toEqual({catalog: emptyCatalog, status: 'ready'})
  await expect(secondResult).resolves.toEqual({catalog: emptyCatalog, status: 'ready'})
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('should preserve the catalog failure as a renderable query result', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503})))

  await expect(adminCatalogQuery()).resolves.toEqual({
    message: '음악 목록을 불러오지 못했습니다.',
    status: 'failed',
  })
})

it('should reject invalid catalog data without exposing it to the component', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({albums: null})))

  await expect(adminCatalogQuery()).resolves.toMatchObject({status: 'failed'})
})
