export const PAYMENT_PROVIDERS = ['paddle', 'apps-in-toss'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const PAYMENT_METHODS = ['card', 'link', 'iap'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const isPaymentProvider = (value: unknown): value is PaymentProvider =>
  typeof value === 'string' && PAYMENT_PROVIDERS.includes(value as PaymentProvider)

export interface PreparePaymentRequest {
  readonly productId: string
  readonly provider?: PaymentProvider
}

export interface PaymentDetails {
  readonly amountMinor: string
  readonly currency: string
  readonly expiresAt: string
  readonly orderId: string
  readonly productId: string
}

export interface PaymentPreparation extends PaymentDetails {
  readonly provider: PaymentProvider
}

export interface PaddlePayment extends PaymentDetails {
  readonly checkoutUrl: string
  readonly provider: 'paddle'
}

export interface AppsInTossPayment extends PaymentDetails {
  readonly provider: 'apps-in-toss'
  readonly sku: string
}

export type PreparedPayment = AppsInTossPayment | PaddlePayment

export interface PaymentStarted {
  readonly orderId: string
  readonly status: 'started'
}

export interface PaymentCanceled {
  readonly status: 'canceled'
}

export interface PaymentRejected {
  readonly code:
    | 'already_owned'
    | 'login_required'
    | 'price_changed'
    | 'provider_unavailable'
    | 'unavailable'
  readonly status: 'rejected'
}

export interface PaymentPending {
  readonly orderId: string
  readonly status: 'pending'
}

export interface PaymentFailed {
  readonly code: 'network_error' | 'provider_error'
  readonly status: 'failed'
}

export type PayResult =
  | PaymentCanceled
  | PaymentFailed
  | PaymentPending
  | PaymentRejected
  | PaymentStarted

export interface PaddlePaymentAdapter {
  readonly dispose: () => void
  readonly pay: (payment: PaddlePayment) => Promise<PayResult>
  readonly provider: 'paddle'
}

export interface AppsInTossPaymentAdapter {
  readonly dispose: () => void
  readonly pay: (payment: AppsInTossPayment) => Promise<PayResult>
  readonly provider: 'apps-in-toss'
}

export type PaymentAdapter = AppsInTossPaymentAdapter | PaddlePaymentAdapter

export interface PaymentClient {
  readonly dispose: () => void
  readonly pay: (payment: PreparedPayment) => Promise<PayResult>
}

export type PaymentPreparationResult = PaymentPreparation | PaymentRejected
