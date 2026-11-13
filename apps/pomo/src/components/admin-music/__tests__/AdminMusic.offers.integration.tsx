/** @vitest-environment jsdom */

import {MemoryRouter, revalidate} from '@solidjs/router'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {adminCatalogQuery} from 'src/features/admin-music/catalog-query'
import type {AdminCatalog} from 'src/features/admin-music/catalog'
import {AdminMusic} from '../AdminMusic'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))

const FIRST_ALBUM = '00000000-0000-4000-8000-000000000001'
const SECOND_ALBUM = '00000000-0000-4000-8000-000000000002'

const createCatalog = (): AdminCatalog => ({
  albums: [FIRST_ALBUM, SECOND_ALBUM].map((id, index) => ({
    coverFallback: 'music',
    coverImageUrl: null,
    id,
    release: {blockers: [], ready: true},
    status: 'published',
    translations: [{albumId: id, description: '', locale: 'ko', title: `앨범 ${index + 1}`}],
  })),
  assets: [],
  offers: [FIRST_ALBUM, SECOND_ALBUM].map((albumId) => ({
    albumId,
    billingType: 'one_time',
    externalProductId: `sku-existing-${albumId}`,
    productCode: albumId,
    productStatus: 'active',
    provider: 'apps-in-toss',
    status: 'active',
  })),
  pendingTracks: [],
  tracks: [],
})

beforeEach(async () => {
  await revalidate(adminCatalogQuery.key)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const mountOffers = async (hasOffers = true) => {
  const catalog = createCatalog()
  if (!hasOffers) {
    catalog.offers = []
  }
  const response = Promise.withResolvers<Response>()
  const fetcher = vi.fn<typeof fetch>(async (input, options) => {
    if (String(input).endsWith('/api/admin/music/offers') && options?.method === 'POST') {
      const result = await response.promise
      if (result.ok) {
        const payload = JSON.parse(String(options.body))
        catalog.offers = [
          ...catalog.offers.filter((offer) => offer.albumId !== payload.albumId),
          {
            albumId: payload.albumId,
            billingType: 'one_time',
            externalProductId: payload.externalProductId,
            productCode: payload.albumId,
            productStatus: 'active',
            provider: 'apps-in-toss',
            status: 'active',
          },
        ]
      }
      return result.clone()
    }
    if (options?.method === undefined || options.method === 'GET') {
      return Response.json(catalog)
    }
    throw new Error(`Unexpected request: ${String(input)}`)
  })
  vi.stubGlobal('fetch', fetcher)
  render(() => <MemoryRouter root={AdminMusic} />)
  await waitFor(() => expect(screen.getByRole('tab', {name: '판매 및 공개'})).toBeInTheDocument())
  fireEvent.click(screen.getByRole('tab', {name: '판매 및 공개'}))
  if (hasOffers) {
    fireEvent.click(screen.getByText('다른 상품 연결'))
  }
  const input = screen.getByRole('textbox', {name: '앱인토스 상품 ID (SKU)'})
  const submit = (sku: string) => {
    fireEvent.input(input, {target: {value: sku}})
    fireEvent.click(screen.getByRole('button', {name: '일회성 상품 연결'}))
  }
  return {catalog, fetcher, input, response, submit}
}

it('should retain and submit the newer SKU after the previous connection succeeds', async () => {
  const {fetcher, input, response, submit} = await mountOffers()
  submit('sku-a')
  await waitFor(() => expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled())
  expect(input).toBeEnabled()
  fireEvent.input(input, {target: {value: 'sku-b'}})
  response.resolve(Response.json({success: true}))
  await waitFor(() =>
    expect(screen.getByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeInTheDocument(),
  )
  expect(input).toHaveValue('sku-b')
  expect(screen.getByText('sku-a')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '일회성 상품 연결'}))
  await waitFor(() =>
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(2),
  )
  expect(
    fetcher.mock.calls
      .filter(([, options]) => options?.method === 'POST')
      .map(([, options]) => JSON.parse(String(options?.body))),
  ).toEqual([
    {albumId: FIRST_ALBUM, externalProductId: 'sku-a', provider: 'apps-in-toss'},
    {albumId: FIRST_ALBUM, externalProductId: 'sku-b', provider: 'apps-in-toss'},
  ])
  await waitFor(() => expect(screen.getByText('sku-b')).toBeInTheDocument())
  expect(input).toHaveValue('')
  await waitFor(() => expect(screen.getByRole('button', {name: '일회성 상품 연결'})).toBeEnabled())
  await waitFor(() =>
    expect(screen.getByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeInTheDocument(),
  )
})

it('should reset an unchanged SKU after a successful connection', async () => {
  const {input, response, submit} = await mountOffers()
  submit('sku-a')
  await waitFor(() => expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled())
  response.resolve(Response.json({success: true}))
  await waitFor(() =>
    expect(screen.getByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeInTheDocument(),
  )
  expect(input).toHaveValue('')
  expect(screen.getByRole('button', {name: '일회성 상품 연결'})).toBeEnabled()
})

it('should preserve the latest SKU on failure and retry that SKU', async () => {
  const {fetcher, input, response, submit} = await mountOffers()
  submit('sku-a')
  await waitFor(() => expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled())
  fireEvent.input(input, {target: {value: 'sku-b'}})
  response.resolve(new Response(null, {status: 409}))
  await waitFor(() =>
    expect(
      screen.getByText('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.'),
    ).toBeInTheDocument(),
  )
  expect(input).toHaveValue('sku-b')
  fetcher.mockImplementationOnce(async () => Response.json({success: true}))
  fireEvent.click(screen.getByRole('button', {name: '일회성 상품 연결'}))
  await waitFor(() =>
    expect(screen.getByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeInTheDocument(),
  )
  expect(
    fetcher.mock.calls
      .filter(([, options]) => options?.method === 'POST')
      .map(([, options]) => JSON.parse(String(options?.body)).externalProductId),
  ).toEqual(['sku-a', 'sku-b'])
  expect(input).toHaveValue('')
})

it('should preserve the other album input when an earlier connection completes', async () => {
  const {fetcher, response, submit} = await mountOffers()
  submit('sku-a')
  await waitFor(() => expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled())
  fireEvent.click(screen.getByRole('button', {name: /앨범 2.*공개/u}))
  fireEvent.click(screen.getByRole('tab', {name: '판매 및 공개'}))
  fireEvent.click(screen.getByText('다른 상품 연결'))
  const otherInput = screen.getByRole('textbox', {name: '앱인토스 상품 ID (SKU)'})
  fireEvent.input(otherInput, {target: {value: 'sku-other'}})
  response.resolve(Response.json({success: true}))
  await waitFor(() =>
    expect(screen.getByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeInTheDocument(),
  )
  expect(otherInput).toHaveValue('sku-other')
  fireEvent.click(screen.getByRole('button', {name: '일회성 상품 연결'}))
  await waitFor(() =>
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(2),
  )
  expect(
    fetcher.mock.calls
      .filter(([, options]) => options?.method === 'POST')
      .map(([, options]) => JSON.parse(String(options?.body))),
  ).toEqual([
    {albumId: FIRST_ALBUM, externalProductId: 'sku-a', provider: 'apps-in-toss'},
    {albumId: SECOND_ALBUM, externalProductId: 'sku-other', provider: 'apps-in-toss'},
  ])
  await waitFor(() => expect(screen.getByRole('button', {name: '일회성 상품 연결'})).toBeEnabled())
  await waitFor(() =>
    expect(screen.getByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeInTheDocument(),
  )
})

it('should keep the initial connection transition to the other-product form', async () => {
  const {input, response, submit} = await mountOffers(false)
  expect(screen.queryByText('다른 상품 연결')).not.toBeInTheDocument()
  submit('sku-a')
  await waitFor(() => expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled())
  response.resolve(Response.json({success: true}))
  await waitFor(() =>
    expect(screen.getByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeInTheDocument(),
  )
  expect(screen.getByText('sku-a')).toBeInTheDocument()
  expect(input).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('다른 상품 연결'))
  expect(screen.getByRole('textbox', {name: '앱인토스 상품 ID (SKU)'})).toHaveValue('')
})
