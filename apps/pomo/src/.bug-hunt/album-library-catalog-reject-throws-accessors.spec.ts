/** @vitest-environment jsdom */

import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  loadBundledPAlbums,
  publishedAlbumCatalogQuery,
  type PResolvedAlbum,
} from '../features/focus-room-audio'
import {useAlbumLibrary} from '../components/album-library/use-album-library'

vi.mock('../features/focus-room-audio', () => ({
  loadBundledPAlbums: vi.fn(),
  publishedAlbumCatalogQuery: vi.fn(),
}))
vi.mock('@solidjs/router', async () => {
  const actual = await vi.importActual<typeof import('@solidjs/router')>('@solidjs/router')
  return {...actual, revalidate: vi.fn()}
})

const bundledAlbum: PResolvedAlbum = {
  description: 'bundled',
  icon: 'i-tabler-vinyl',
  id: 'bundled',
  title: 'Bundled',
  trackIds: [],
  tracks: [],
}

beforeEach(() => {
  vi.mocked(loadBundledPAlbums).mockResolvedValue([bundledAlbum])
  publishedAlbumCatalogQuery.keyFor = (locale) => `catalog-${locale}`
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should expose bundled albums and a catalog error when published catalog query rejects', async () => {
  const networkError = new Error('catalog offline')
  vi.mocked(publishedAlbumCatalogQuery).mockRejectedValue(networkError)

  const {result} = renderHook(useAlbumLibrary)

  await waitFor(() => expect(loadBundledPAlbums).toHaveBeenCalled())

  expect(() => result.albums()).not.toThrow()
  expect(result.albums()).toEqual([bundledAlbum])
  expect(() => result.catalogError()).not.toThrow()
  expect(result.catalogError()).toBeInstanceOf(Error)
})
