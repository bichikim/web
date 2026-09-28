import {createSignal} from 'solid-js'

import {pay} from './pay'
import {type PaymentStartResult, preparePayment} from './prepare-payment'
import type {PaymentRejected, PayResult} from './types'

export type PaymentFlowState =
  | {readonly status: 'idle'}
  | {readonly productId: string; readonly status: 'preparing'}
  | {readonly orderId: string; readonly productId: string; readonly status: 'pending'}
  | {readonly productId: string; readonly status: 'canceled'}
  | {
      readonly code: PaymentRejected['code']
      readonly productId: string
      readonly status: 'rejected'
    }
  | {
      readonly code: 'network_error' | 'provider_error'
      readonly productId: string
      readonly status: 'failed'
    }
  | {readonly orderId: string; readonly productId: string; readonly status: 'redirecting'}

export interface PaymentFlowController {
  readonly purchase: (productId: string) => Promise<void>
  readonly reset: () => void
  readonly state: () => PaymentFlowState
}

const isBusy = (state: PaymentFlowState): boolean =>
  state.status === 'preparing' || state.status === 'redirecting' || state.status === 'pending'

const isPaymentRejected = (result: PaymentStartResult): result is PaymentRejected =>
  'status' in result && result.status === 'rejected'

const setPayResultState = (
  productId: string,
  result: PayResult,
  setState: (state: PaymentFlowState) => void,
): void => {
  switch (result.status) {
    case 'canceled':
      setState({productId, status: 'canceled'})
      return
    case 'failed':
      setState({code: result.code, productId, status: 'failed'})
      return
    case 'pending':
      setState({orderId: result.orderId, productId, status: 'pending'})
      return
    case 'rejected':
      setState({code: result.code, productId, status: 'rejected'})
      return
    case 'started':
      setState({orderId: result.orderId, productId, status: 'redirecting'})
  }
}

export const usePaymentFlow = (): PaymentFlowController => {
  const [state, setState] = createSignal<PaymentFlowState>({status: 'idle'})

  const purchase = async (productId: string): Promise<void> => {
    if (isBusy(state())) {
      return
    }

    setState({productId, status: 'preparing'})

    try {
      const preparation = await preparePayment({productId, provider: 'paddle'})

      if (isPaymentRejected(preparation)) {
        setState({code: preparation.code, productId, status: 'rejected'})
        return
      }

      setPayResultState(productId, await pay(preparation), setState)
    } catch (error: unknown) {
      console.error('Failed to prepare or start album payment.', error)
      setState({code: 'network_error', productId, status: 'failed'})
    }
  }

  return {
    purchase,
    reset: () => setState({status: 'idle'}),
    state,
  }
}
