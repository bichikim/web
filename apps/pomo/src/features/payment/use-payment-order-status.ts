import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {
  getPaymentOrder,
  PaymentAuthenticationRequiredError,
  type PaymentOrderStatusView,
} from './orders'

export type PaymentOrderStatusState =
  | {readonly kind: 'checking'}
  | {readonly kind: 'error'; readonly error: Error}
  | {readonly kind: 'missing'}
  | {readonly kind: 'ready'; readonly order: PaymentOrderStatusView}
  | {readonly kind: 'unauthenticated'}

export interface PaymentOrderStatusController {
  readonly refresh: () => Promise<void>
  readonly state: Accessor<PaymentOrderStatusState>
}

const isProcessing = (order: PaymentOrderStatusView): boolean =>
  order.status === 'pending' || (order.status === 'paid' && order.entitlementStatus === 'missing')

const RETRY_DELAY_MILLISECONDS = 3000
const MAX_AUTOMATIC_RETRIES = 5

export const usePaymentOrderStatus = (
  orderId: Accessor<string | null>,
): PaymentOrderStatusController => {
  const [state, setState] = createSignal<PaymentOrderStatusState>({kind: 'missing'})
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let automaticRetries = 0
  let isDisposed = false
  let isLoading = false

  const clearRetryTimer = () => {
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer)
      retryTimer = undefined
    }
  }

  const scheduleRetry = () => {
    if (automaticRetries >= MAX_AUTOMATIC_RETRIES || isDisposed) {
      return
    }

    automaticRetries += 1
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      load(true).catch(() => undefined)
    }, RETRY_DELAY_MILLISECONDS)
  }

  const load = async (automatic: boolean): Promise<void> => {
    if (isLoading || isDisposed) {
      return
    }

    if (!automatic) {
      clearRetryTimer()
      automaticRetries = 0
    }

    const id = orderId()
    if (id === null || id.length === 0) {
      setState({kind: 'missing'})
      return
    }

    isLoading = true
    setState({kind: 'checking'})

    try {
      const order = await getPaymentOrder(id)

      if (isDisposed) {
        return
      }

      setState({kind: 'ready', order})
      if (isProcessing(order)) {
        scheduleRetry()
      }
    } catch (error: unknown) {
      if (isDisposed) {
        return
      }

      if (error instanceof PaymentAuthenticationRequiredError) {
        setState({kind: 'unauthenticated'})
      } else if (error instanceof Error) {
        setState({error, kind: 'error'})
      } else {
        setState({error: new Error('Payment order status is unavailable'), kind: 'error'})
      }
    } finally {
      isLoading = false
    }
  }

  const refresh = () => load(false)

  onMount(() => {
    refresh().catch(() => undefined)
  })
  onCleanup(() => {
    isDisposed = true
    clearRetryTimer()
  })

  return {refresh, state}
}
