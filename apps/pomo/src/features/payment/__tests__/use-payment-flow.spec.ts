/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

const paymentMocks = vi.hoisted(() => ({pay: vi.fn(), preparePayment: vi.fn()}))

vi.mock('../pay', () => paymentMocks)
vi.mock('../prepare-payment', () => ({preparePayment: paymentMocks.preparePayment}))

import {usePaymentFlow} from '../use-payment-flow'

const payment = {
  amountMinor: '1000',
  checkoutUrl: 'https://checkout.paddle.com/c/pay/cs-1',
  currency: 'USD',
  expiresAt: '2026-09-20T00:15:00.000Z',
  orderId: 'order-1',
  productId: 'product-1',
  provider: 'paddle' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should expose redirecting instead of treating checkout start as completion', async () => {
  paymentMocks.preparePayment.mockResolvedValue(payment)
  paymentMocks.pay.mockResolvedValue({orderId: 'order-1', status: 'started'})

  const controller = renderHook(usePaymentFlow)
  await controller.result.purchase('product-1')

  expect(controller.result.state()).toEqual({
    orderId: 'order-1',
    productId: 'product-1',
    status: 'redirecting',
  })
})

it('should preserve a server rejection without calling the provider adapter', async () => {
  paymentMocks.preparePayment.mockResolvedValue({code: 'login_required', status: 'rejected'})

  const controller = renderHook(usePaymentFlow)
  await controller.result.purchase('product-1')

  expect(controller.result.state()).toEqual({
    code: 'login_required',
    productId: 'product-1',
    status: 'rejected',
  })
  expect(paymentMocks.pay).not.toHaveBeenCalled()
})
