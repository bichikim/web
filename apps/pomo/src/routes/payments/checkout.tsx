import {Title} from '@solidjs/meta'
import {initializePaddle} from '@paddle/paddle-js'
import {A} from '@solidjs/router'
import {createSignal, onMount, Show} from 'solid-js'

const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const TRANSACTION_ID_PATTERN = /^txn_[a-z\d]+$/u

export default function PaddleCheckoutPage() {
  const [error, setError] = createSignal(false)

  onMount(() => {
    const url = new URL(globalThis.location.href)
    const orderId = url.searchParams.get('order_id')
    const transactionId = url.searchParams.get('_ptxn')
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
    const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT

    if (
      orderId === null ||
      !ORDER_ID_PATTERN.test(orderId) ||
      transactionId === null ||
      !TRANSACTION_ID_PATTERN.test(transactionId) ||
      typeof token !== 'string' ||
      (environment !== 'sandbox' && environment !== 'production') ||
      (environment === 'sandbox' && !token.startsWith('test_')) ||
      (environment === 'production' && !token.startsWith('live_'))
    ) {
      setError(true)
      return
    }

    const returnUrl = new URL('/payments/return', url.origin)
    returnUrl.searchParams.set('order_id', orderId)
    const cancelUrl = new URL(returnUrl)
    cancelUrl.searchParams.set('status', 'cancelled')

    let completed = false
    initializePaddle({
      environment,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          completed = true
        }
        if (event.name === 'checkout.closed' && !completed) {
          globalThis.location.assign(cancelUrl.toString())
        }
      },
      token,
    })
      .then((paddle) => {
        if (paddle === undefined) {
          setError(true)
          return
        }

        paddle.Checkout.open({
          settings: {
            displayMode: 'overlay',
            successUrl: returnUrl.toString(),
          },
          transactionId,
        })
      })
      .catch(() => setError(true))
  })

  return (
    <main class="grid min-h-dvh place-items-center bg-surface px-5 py-10 text-foreground">
      <Title>앨범 결제</Title>
      <section class="grid w-full max-w-md gap-4 rounded-panel border border-solid border-border p-6">
        <h1 class="m-0 text-xl font-800">앨범 결제</h1>
        <Show
          fallback={<p class="m-0 text-sm text-muted-foreground">결제창을 여는 중입니다…</p>}
          when={error()}
        >
          <p class="m-0 text-sm text-danger">결제창을 열지 못했습니다. 다시 시도해 주세요.</p>
        </Show>
        <A class="text-sm font-700 text-highlight underline" href="/">
          앨범으로 돌아가기
        </A>
      </section>
    </main>
  )
}
