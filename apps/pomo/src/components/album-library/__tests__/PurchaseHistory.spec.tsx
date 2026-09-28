/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {getLocale} from '@paraglide/runtime'
import {afterEach, expect, it} from 'vitest'

import type {PResolvedAlbum} from '../../../features/focus-room-audio'
import type {PaymentOrderHistoryView} from '../../../features/payment'
import {PurchaseHistory} from '../PurchaseHistory'

afterEach(() => {
  cleanup()
})

const album: PResolvedAlbum = {
  description: 'Published album',
  icon: 'i-tabler-vinyl',
  id: 'published-album',
  productId: 'product-1',
  title: 'Published album',
  trackIds: [],
  tracks: [],
}

const order: PaymentOrderHistoryView = {
  amountMinor: '1000',
  createdAt: '2026-09-20T00:00:00.000Z',
  currency: 'USD',
  entitlementStatus: 'granted',
  fractionalDigits: 2,
  orderId: 'order-1',
  paidAt: '2026-09-21T00:00:00.000Z',
  productId: 'product-1',
  providerPaymentIntentId: 'pi-1',
  providerSessionId: 'cs-1',
  receiptUrl: null,
  refundedAt: null,
  status: 'paid',
}

it('should show the payment completion date when it is available', () => {
  render(() => <PurchaseHistory albums={[album]} orders={[order]} />)

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(getLocale(), {dateStyle: 'medium'}).format(new Date(value))

  expect(screen.getByText(formatDate(order.paidAt!))).toBeVisible()
  expect(screen.queryByText(formatDate(order.createdAt))).not.toBeInTheDocument()
})
