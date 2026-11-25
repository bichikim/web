/** @vitest-environment jsdom */

import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {cookieName, getLocale, setLocale} from '@paraglide/runtime'
import {setAppLocale} from 'src/features/locale'
import {revalidate} from '@solidjs/router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  deleteCustomAlbum,
  readCustomAlbums,
  type ResolvedCustomAlbum,
} from '../../../features/custom-albums'
import {
  loadBundledPAlbums,
  type PResolvedAlbum,
  publishedAlbumCatalogQuery,
} from '../../../features/focus-room-audio'
import {useAlbumLibrary} from '../use-album-library'

vi.mock('../../../features/focus-room-audio', () => ({
  loadBundledPAlbums: vi.fn(),
  publishedAlbumCatalogQuery: vi.fn(),
}))
vi.mock('../../../features/custom-albums', () => ({
  deleteCustomAlbum: vi.fn(),
  readCustomAlbums: vi.fn(),
}))
vi.mock('@solidjs/router', async () => {
  const actual = await vi.importActual<typeof import('@solidjs/router')>('@solidjs/router')
  return {...actual, revalidate: vi.fn()}
})

const album = (title: string): PResolvedAlbum => ({
  description: title,
  icon: 'i-tabler-vinyl',
  id: title,
  title,
  trackIds: [],
  tracks: [],
})

beforeEach(() => {
  vi.mocked(readCustomAlbums).mockResolvedValue([])
  vi.mocked(loadBundledPAlbums).mockImplementation(async (options) => [
    album(`bundled-${options?.locale}`),
  ])
  vi.mocked(publishedAlbumCatalogQuery).mockImplementation(async (locale) => ({
    albums: [album(`published-${locale}`)],
    status: 'ready',
  }))
  publishedAlbumCatalogQuery.keyFor = (locale) => `catalog-${locale}`
})

it('should keep a deleted album out of the list when an earlier reload completes later', async () => {
  const deleted = {...album('deleted'), customCoverImage: null}
  const retained = {...album('retained'), customCoverImage: null}
  const stale = Promise.withResolvers<ReadonlyArray<ResolvedCustomAlbum>>()
  vi.mocked(readCustomAlbums)
    .mockResolvedValueOnce([deleted])
    .mockReturnValueOnce(stale.promise)
    .mockResolvedValue([retained])
  const {result} = renderHook(useAlbumLibrary)
  await waitFor(() => expect(result.customAlbums()).toEqual([deleted]))

  const reload = result.reloadCustomAlbums()
  await result.deleteCustomAlbum(deleted.id)
  expect(deleteCustomAlbum).toHaveBeenCalledExactlyOnceWith(deleted.id)
  stale.resolve([deleted])
  await reload

  expect(result.customAlbums()).toEqual([retained])
  expect(result.isCustomAlbumsLoading()).toBe(false)
})
afterEach(() => {
  cleanup()
  document.cookie = `${cookieName}=; path=/; max-age=0`
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

it('should load the selected locale after the runtime requests a document reload', async () => {
  document.cookie = `${cookieName}=ko; path=/`
  const initial = renderHook(useAlbumLibrary)
  await waitFor(() =>
    expect(initial.result.albums().map((item) => item.title)).toEqual([
      'bundled-ko',
      'published-ko',
    ]),
  )

  const reload = vi.fn()
  const browserWindow = globalThis.window
  vi.stubGlobal('window', {location: {href: browserWindow.location.href, reload}})
  try {
    await setLocale('en')
    expect(reload).toHaveBeenCalledOnce()
    expect(getLocale()).toBe('en')
  } finally {
    vi.unstubAllGlobals()
  }

  // Model document reload by disposing the old library before mounting its replacement.
  initial.cleanup()
  const next = renderHook(useAlbumLibrary)
  await waitFor(() =>
    expect(next.result.albums().map((item) => item.title)).toEqual(['bundled-en', 'published-en']),
  )
  await next.result.retryCatalog()
  expect(revalidate).toHaveBeenLastCalledWith('catalog-en')
  await next.result.retryLibrary()
  expect(loadBundledPAlbums).toHaveBeenLastCalledWith({locale: 'en'})
  expect(revalidate).toHaveBeenLastCalledWith('catalog-en')
})

it('should replace the mounted catalog and discard an older locale response', async () => {
  await setAppLocale('ko', {reload: false})
  const korean = Promise.withResolvers<Awaited<ReturnType<typeof publishedAlbumCatalogQuery>>>()
  vi.mocked(publishedAlbumCatalogQuery).mockReturnValueOnce(korean.promise)
  const {result} = renderHook(useAlbumLibrary)
  await waitFor(() => expect(publishedAlbumCatalogQuery).toHaveBeenCalledWith('ko'))

  try {
    await setAppLocale('en', {reload: false})
    const titles = () => result.albums().map((item) => item.title)
    await waitFor(() => expect(titles()).toEqual(['bundled-en', 'published-en']))
    korean.resolve({albums: [album('published-ko')], status: 'ready'})
    await korean.promise
    expect(titles()).toEqual(['bundled-en', 'published-en'])
    await result.retryCatalog()
    expect(revalidate).toHaveBeenLastCalledWith('catalog-en')
  } finally {
    await setAppLocale('ko', {reload: false})
  }
})

it('should keep bundled albums and expose the error when the published catalog query rejects', async () => {
  const catalogError = new Error('catalog offline')
  const locale = getLocale()
  vi.mocked(publishedAlbumCatalogQuery).mockRejectedValue(catalogError)

  const result = renderHook(useAlbumLibrary)

  await waitFor(() => {
    expect(result.result.albums().map((item) => item.title)).toEqual([`bundled-${locale}`])
    expect(result.result.catalogError()).toBe(catalogError)
  })
})

it('should normalize a non-Error published catalog rejection', async () => {
  const cause = 'catalog offline'
  const locale = getLocale()
  vi.mocked(publishedAlbumCatalogQuery).mockRejectedValue(cause)

  const result = renderHook(useAlbumLibrary)

  await waitFor(() => {
    expect(result.result.albums().map((item) => item.title)).toEqual([`bundled-${locale}`])
    const error = result.result.catalogError()
    expect(error).toBeInstanceOf(Error)
    expect(error?.cause).toBe(cause)
  })
})
