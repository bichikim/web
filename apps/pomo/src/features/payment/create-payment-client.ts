import {createPaddlePaymentAdapter} from './providers/paddle'
import type {
  AppsInTossPaymentAdapter,
  PaddlePaymentAdapter,
  PaymentAdapter,
  PaymentClient,
  PreparedPayment,
} from './types'

export interface CreatePaymentClientOptions {
  readonly adapters?: ReadonlyArray<PaymentAdapter>
}

const findPaddleAdapter = (
  adapters: ReadonlyArray<PaymentAdapter>,
): PaddlePaymentAdapter | undefined =>
  adapters.find((adapter): adapter is PaddlePaymentAdapter => adapter.provider === 'paddle')

const findAppsInTossAdapter = (
  adapters: ReadonlyArray<PaymentAdapter>,
): AppsInTossPaymentAdapter | undefined =>
  adapters.find(
    (adapter): adapter is AppsInTossPaymentAdapter => adapter.provider === 'apps-in-toss',
  )

const getProviderUnavailable = () => ({code: 'provider_unavailable', status: 'rejected'}) as const

export const createPaymentClient = (options: CreatePaymentClientOptions = {}): PaymentClient => {
  const adapters = options.adapters ?? []
  const paddleAdapter = findPaddleAdapter(adapters) ?? createPaddlePaymentAdapter()
  const appsInTossAdapter = findAppsInTossAdapter(adapters)
  let activeOrderId: string | null = null

  const pay = async (payment: PreparedPayment) => {
    if (activeOrderId !== null) {
      return {orderId: activeOrderId, status: 'pending' as const}
    }

    activeOrderId = payment.orderId
    try {
      const result = await (payment.provider === 'paddle'
        ? paddleAdapter.pay(payment)
        : (appsInTossAdapter?.pay(payment) ?? getProviderUnavailable()))

      if (result.status !== 'started' && result.status !== 'pending') {
        activeOrderId = null
      }

      return result
    } catch (error: unknown) {
      activeOrderId = null
      throw error
    }
  }

  const dispose = () => {
    paddleAdapter.dispose()
    appsInTossAdapter?.dispose()
    activeOrderId = null
  }

  return {dispose, pay}
}
