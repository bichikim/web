import {Title} from '@solidjs/meta'
import {A, useSearchParams} from '@solidjs/router'
import {createMemo, Match, Show, Switch} from 'solid-js'

import * as m from '@paraglide/message'

import {
  getPaymentReturnKind,
  type PaymentOrderStatusView,
  usePaymentOrderStatus,
} from '../../features/payment'

const RETURN_ACTION_CLASSES =
  'w-fit cursor-pointer rounded-control border border-solid border-border bg-transparent ' +
  'px-4 py-2 font-[inherit] text-sm font-750 text-foreground'

const getLoginHref = (orderId: string | null): string => {
  const returnPath =
    orderId === null
      ? '/payments/return'
      : `/payments/return?order_id=${encodeURIComponent(orderId)}`

  return `/account?returnTo=${encodeURIComponent(returnPath)}`
}

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams()
  const orderId = createMemo(() =>
    typeof searchParams.order_id === 'string' && searchParams.order_id.length > 0
      ? searchParams.order_id
      : null,
  )
  const returnedFromCanceledCheckout = createMemo(() => searchParams.status === 'cancelled')
  const payment = usePaymentOrderStatus(() => {
    const value = searchParams.order_id
    return typeof value === 'string' && value.length > 0 ? value : null
  })
  const readyState = () => {
    const state = payment.state()
    return state.kind === 'ready' ? state : undefined
  }
  const readyKind = (order: PaymentOrderStatusView) =>
    getPaymentReturnKind(order, returnedFromCanceledCheckout())

  return (
    <main class="grid min-h-dvh place-items-center bg-surface px-5 py-10 text-foreground">
      <Title>{m.payment_return_title()}</Title>
      <section class="grid w-full max-w-md gap-4 rounded-panel border border-solid border-border p-6">
        <Switch>
          <Match when={orderId() === null}>
            <div>
              <p class="m-0 text-sm font-700 text-highlight">{m.payment_return_title()}</p>
              <h1 class="mb-0 mt-2 text-xl font-800">{m.payment_return_missing_order()}</h1>
            </div>
          </Match>
          <Match when={payment.state().kind === 'checking'}>
            <div aria-live="polite" role="status">
              <p class="m-0 text-sm font-700 text-highlight">{m.payment_return_title()}</p>
              <h1 class="mb-0 mt-2 text-xl font-800">{m.payment_return_checking()}</h1>
            </div>
          </Match>
          <Match when={payment.state().kind === 'unauthenticated'}>
            <div>
              <p class="m-0 text-sm font-700 text-highlight">{m.payment_return_title()}</p>
              <h1 class="mb-0 mt-2 text-xl font-800">{m.payment_return_auth_required()}</h1>
            </div>
            <A
              class="inline-flex w-fit rounded-control bg-primary px-4 py-2 text-sm font-750 text-white no-underline"
              href={getLoginHref(orderId())}
            >
              {m.payment_return_sign_in()}
            </A>
          </Match>
          <Match when={payment.state().kind === 'error'}>
            <div>
              <p class="m-0 text-sm font-700 text-danger">{m.payment_return_title()}</p>
              <h1 class="mb-0 mt-2 text-xl font-800">{m.payment_return_failed()}</h1>
            </div>
            <p class="m-0 text-sm leading-6 text-muted-foreground">
              {m.payment_return_failed_description()}
            </p>
            <button
              class={RETURN_ACTION_CLASSES}
              onClick={() => payment.refresh().catch(() => undefined)}
              type="button"
            >
              {m.payment_return_refresh()}
            </button>
          </Match>
          <Match when={readyState()}>
            {(state) => {
              const kind = () => readyKind(state().order)

              return (
                <>
                  <div>
                    <p class="m-0 text-sm font-700 text-highlight">{m.payment_return_title()}</p>
                    <h1 class="mb-0 mt-2 text-xl font-800">
                      <Switch>
                        <Match when={kind() === 'completed'}>{m.payment_return_completed()}</Match>
                        <Match when={kind() === 'processing'}>
                          {m.payment_return_processing()}
                        </Match>
                        <Match when={kind() === 'canceled'}>{m.payment_return_canceled()}</Match>
                        <Match when={kind() === 'refunded'}>{m.payment_return_refunded()}</Match>
                        <Match when={kind() === 'failed'}>{m.payment_return_failed()}</Match>
                      </Switch>
                    </h1>
                  </div>
                  <p class="m-0 text-sm leading-6 text-muted-foreground">
                    <Switch>
                      <Match when={kind() === 'completed'}>
                        {m.payment_return_completed_description()}
                      </Match>
                      <Match when={kind() === 'processing'}>
                        {m.payment_return_processing_description()}
                      </Match>
                      <Match when={kind() === 'canceled'}>
                        {m.payment_return_canceled_description()}
                      </Match>
                      <Match when={kind() === 'refunded'}>
                        {m.payment_return_refunded_description()}
                      </Match>
                      <Match when={kind() === 'failed'}>
                        {m.payment_return_failed_description()}
                      </Match>
                    </Switch>
                  </p>
                  <Show when={kind() === 'processing'}>
                    <button
                      class={RETURN_ACTION_CLASSES}
                      onClick={() => payment.refresh().catch(() => undefined)}
                      type="button"
                    >
                      {m.payment_return_refresh()}
                    </button>
                  </Show>
                </>
              )
            }}
          </Match>
        </Switch>
        <A class="text-sm font-700 text-highlight underline" href="/">
          {m.payment_return_home()}
        </A>
      </section>
    </main>
  )
}
