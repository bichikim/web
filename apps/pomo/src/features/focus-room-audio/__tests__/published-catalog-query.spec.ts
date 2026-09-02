import {query} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'

const catalogMocks = vi.hoisted(() => ({loadPublishedPAlbums: vi.fn()}))

vi.mock('../focus-room-playlist/published-catalog', () => catalogMocks)

import {publishedAlbumCatalogQuery} from '../published-catalog-query'

afterEach(() => {
  query.clear()
  vi.clearAllMocks()
})

it('should forward the locale to the published catalog adapter', async () => {
  const catalog = {albums: [], status: 'ready'} as const
  catalogMocks.loadPublishedPAlbums.mockResolvedValueOnce(catalog)

  await expect(publishedAlbumCatalogQuery('ko')).resolves.toBe(catalog)
  expect(catalogMocks.loadPublishedPAlbums).toHaveBeenCalledOnce()
  expect(catalogMocks.loadPublishedPAlbums).toHaveBeenCalledWith({locale: 'ko'})
})

it('should deduplicate simultaneous requests for the same locale', async () => {
  const request = Promise.withResolvers<{readonly albums: []; readonly status: 'ready'}>()
  catalogMocks.loadPublishedPAlbums.mockReturnValueOnce(request.promise)

  const firstResult = publishedAlbumCatalogQuery('en')
  const secondResult = publishedAlbumCatalogQuery('en')
  request.resolve({albums: [], status: 'ready'})

  await expect(firstResult).resolves.toEqual({albums: [], status: 'ready'})
  await expect(secondResult).resolves.toEqual({albums: [], status: 'ready'})
  expect(catalogMocks.loadPublishedPAlbums).toHaveBeenCalledOnce()
})

it('should preserve the adapter failure union', async () => {
  const error = new Error('catalog unavailable')
  catalogMocks.loadPublishedPAlbums.mockResolvedValueOnce({error, status: 'failed'})

  await expect(publishedAlbumCatalogQuery('ko')).resolves.toEqual({error, status: 'failed'})
})
