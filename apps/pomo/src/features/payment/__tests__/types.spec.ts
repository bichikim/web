import {expect, expectTypeOf, it} from 'vitest'

import {
  isPaymentProvider,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  type PaymentMethod,
  type PaymentProvider,
  type PayResult,
  type PreparedPayment,
} from '../types'

it('should keep providers distinct from payment methods', () => {
  expect(PAYMENT_PROVIDERS).toEqual(['paddle', 'apps-in-toss'])
  expect(PAYMENT_METHODS).toEqual(['card', 'link', 'iap'])
  expectTypeOf<PaymentProvider>().toEqualTypeOf<'paddle' | 'apps-in-toss'>()
  expectTypeOf<PaymentMethod>().toEqualTypeOf<'card' | 'link' | 'iap'>()
})

it('should identify only supported payment providers', () => {
  expect(isPaymentProvider('paddle')).toBe(true)
  expect(isPaymentProvider('apps-in-toss')).toBe(true)
  expect(isPaymentProvider('card')).toBe(false)
  expect(isPaymentProvider(null)).toBe(false)
})

it('should expose the server-prepared payment and normalized result contracts', () => {
  expectTypeOf<PreparedPayment>().toMatchTypeOf<{
    readonly amountMinor: string
    readonly currency: string
    readonly expiresAt: string
    readonly orderId: string
    readonly productId: string
    readonly provider: PaymentProvider
  }>()
  expectTypeOf<PayResult>().toHaveProperty('status')
})
