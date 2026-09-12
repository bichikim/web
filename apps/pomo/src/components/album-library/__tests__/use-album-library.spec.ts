/** @vitest-environment jsdom */

import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {cookieName, getLocale, setLocale} from '@paraglide/runtime'
import {revalidate} from '@solidjs/router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
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
  vi.mocked(loadBundledPAlbums).mockImplementation(async (options) => [
    album(`bundled-${options?.locale}`),
  ])
  vi.mocked(publishedAlbumCatalogQuery).mockImplementation(async (locale) => ({
    albums: [album(`published-${locale}`)],
    status: 'ready',
  }))
  publishedAlbumCatalogQuery.keyFor = (locale) => `catalog-${locale}`
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
  const browserWindow = window
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
