/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createAlbum, createModelHarness} from '../../__tests__/fixtures/model'
import {SalesPanel} from '../SalesPanel'

const APPS_IN_TOSS_OFFER = {
  albumId: 'album',
  amountMinor: null,
  billingType: 'one_time',
  currency: null,
  externalProductId: 'sku_album',
  fractionalDigits: null,
  productCode: 'album.product',
  productStatus: 'active',
  provider: 'apps-in-toss',
  status: 'active',
} as const
const PADDLE_OFFER = {
  albumId: 'album',
  amountMinor: '1000',
  billingType: 'one_time',
  currency: 'USD',
  externalProductId: 'pri_album',
  fractionalDigits: 2,
  productCode: 'album.product',
  productStatus: 'active',
  provider: 'paddle',
  status: 'active',
} as const

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each(['draft', 'published'] as const)(
  'should confirm the %s album transition before closing review',
  async (status) => {
    const {model} = createModelHarness()
    const onStatusReviewClose = vi.fn()
    render(() => (
      <SalesPanel
        album={createAlbum(status)}
        albumId="album"
        albumTitle="앨범"
        model={model}
        isStatusReviewOpen
        offers={[]}
        onStatusReviewClose={onStatusReviewClose}
        onStatusReviewOpen={vi.fn()}
        trackCount={0}
      />
    ))
    fireEvent.click(
      screen.getByRole('button', {name: status === 'draft' ? '공개하기' : '보관하기'}),
    )
    await waitFor(() => expect(onStatusReviewClose).toHaveBeenCalledOnce())
    expect(model.handleAlbumStatusChange).toHaveBeenCalledWith(
      'album',
      status === 'draft' ? 'publish' : 'archive',
    )
  },
)

it('should show every active provider offer with its provider', () => {
  const {model} = createModelHarness()
  render(() => (
    <SalesPanel
      album={createAlbum('draft')}
      albumId="album"
      albumTitle="앨범"
      model={model}
      isStatusReviewOpen={false}
      offers={[APPS_IN_TOSS_OFFER, PADDLE_OFFER]}
      onStatusReviewClose={vi.fn()}
      onStatusReviewOpen={vi.fn()}
      trackCount={0}
    />
  ))

  expect(screen.getByText('Paddle')).toBeTruthy()
  expect(screen.getByText('pri_album')).toBeTruthy()
  expect(screen.getByText('앱인토스', {selector: 'dd'})).toBeTruthy()
  expect(screen.getByText('sku_album')).toBeTruthy()
})
