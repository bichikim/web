/** @vitest-environment jsdom */

import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {cookieName, getLocale, setLocale} from '@paraglide/runtime'
import {revalidate} from '@solidjs/router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  loadBundledPAlbums,
  loadOwnedPAlbums,
  type PResolvedAlbum,
  publishedAlbumCatalogQuery,
} from '../../../features/focus-room-audio'
import {useAlbumLibrary} from '../use-album-library'

const paymentMocks = vi.hoisted(() => ({listPaymentOrders: vi.fn()}))

vi.mock('../../../features/focus-room-audio', () => ({
  loadBundledPAlbums: vi.fn(),
  loadOwnedPAlbums: vi.fn(),
  publishedAlbumCatalogQuery: vi.fn(),
}))
vi.mock('../../../features/payment', () => paymentMocks)
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
  paymentMocks.listPaymentOrders.mockResolvedValue([])
  vi.mocked(loadOwnedPAlbums).mockResolvedValue([])
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

it('should restore owned published albums from the private order history', async () => {
  paymentMocks.listPaymentOrders.mockResolvedValue([
    {
      amountMinor: '1000',
      createdAt: '2026-09-20T00:00:00.000Z',
      currency: 'USD',
      entitlementStatus: 'granted',
      fractionalDigits: 2,
      orderId: 'order-1',
      paidAt: '2026-09-20T00:01:00.000Z',
      productId: 'published-product',
      providerPaymentIntentId: 'pi-1',
      providerSessionId: 'cs-1',
      receiptUrl: null,
      refundedAt: null,
      status: 'paid',
    },
  ])
  vi.mocked(publishedAlbumCatalogQuery).mockResolvedValue({
    albums: [{...album('published-ko'), productId: 'published-product'}],
    status: 'ready',
  })

  const view = renderHook(useAlbumLibrary)

  await waitFor(() => expect(view.result.albums()[1]?.owned).toBe(true))
})

it('should merge an owned archived album with its private tracks after a reload', async () => {
  vi.mocked(loadOwnedPAlbums).mockResolvedValue([
    {
      description: 'Archived description',
      icon: 'i-tabler-vinyl',
      id: 'archived-album',
      owned: true,
      productId: 'archived-product',
      title: 'Archived album',
      trackIds: ['owned-track'],
      trackListings: [{artist: 'Paid Artist', id: 'owned-track', title: 'Owned Track'}],
      tracks: [
        {
          artist: 'Paid Artist',
          durationSeconds: 120,
          id: 'owned-track',
          source: {kind: 'entitled', trackId: 'owned-track'},
          title: 'Owned Track',
        },
      ],
    },
  ])

  const view = renderHook(useAlbumLibrary)

  await waitFor(() => {
    expect(view.result.albums()).toContainEqual(
      expect.objectContaining({id: 'archived-album', owned: true}),
    )
  })
  expect(view.result.albums().find((album) => album.id === 'archived-album')?.tracks).toHaveLength(
    1,
  )
})

it('should preserve the last known ownership when private order history is unavailable', async () => {
  paymentMocks.listPaymentOrders
    .mockResolvedValueOnce([
      {
        amountMinor: '1000',
        createdAt: '2026-09-20T00:00:00.000Z',
        currency: 'USD',
        entitlementStatus: 'granted',
        fractionalDigits: 2,
        orderId: 'order-1',
        paidAt: '2026-09-20T00:01:00.000Z',
        productId: 'published-product',
        providerPaymentIntentId: 'pi-1',
        providerSessionId: 'cs-1',
        receiptUrl: null,
        refundedAt: null,
        status: 'paid',
      },
    ])
    .mockRejectedValueOnce(new Error('history unavailable'))
  vi.mocked(publishedAlbumCatalogQuery).mockResolvedValue({
    albums: [{...album('published-ko'), productId: 'published-product'}],
    status: 'ready',
  })

  const view = renderHook(useAlbumLibrary)

  await waitFor(() => expect(view.result.albums()[1]?.owned).toBe(true))
  await view.result.retryLibrary()

  expect(view.result.albums()[1]?.owned).toBe(true)
})

it('should ignore an older private order history response', async () => {
  const initialResponse = Promise.withResolvers<readonly never[]>()
  const refreshedResponse = Promise.withResolvers<
    readonly {
      amountMinor: string
      createdAt: string
      currency: string
      entitlementStatus: 'granted'
      fractionalDigits: number
      orderId: string
      paidAt: string
      productId: string
      providerPaymentIntentId: string
      providerSessionId: string
      receiptUrl: null
      refundedAt: null
      status: 'paid'
    }[]
  >()
  paymentMocks.listPaymentOrders
    .mockReturnValueOnce(initialResponse.promise)
    .mockReturnValueOnce(refreshedResponse.promise)
  vi.mocked(publishedAlbumCatalogQuery).mockResolvedValue({
    albums: [{...album('published-ko'), productId: 'published-product'}],
    status: 'ready',
  })

  const view = renderHook(useAlbumLibrary)
  const retry = view.result.retryLibrary()

  refreshedResponse.resolve([
    {
      amountMinor: '1000',
      createdAt: '2026-09-20T00:00:00.000Z',
      currency: 'USD',
      entitlementStatus: 'granted',
      fractionalDigits: 2,
      orderId: 'order-1',
      paidAt: '2026-09-20T00:01:00.000Z',
      productId: 'published-product',
      providerPaymentIntentId: 'pi-1',
      providerSessionId: 'cs-1',
      receiptUrl: null,
      refundedAt: null,
      status: 'paid',
    },
  ])
  await waitFor(() => expect(view.result.albums()[1]?.owned).toBe(true))

  initialResponse.resolve([])
  await retry

  expect(view.result.albums()[1]?.owned).toBe(true)
})
